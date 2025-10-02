import React, { useState, useCallback } from 'react';
import type { ReceiptData, SavedReceiptData } from '../types';
import { extractReceiptData } from '../services/geminiService';
import FileUpload from './FileUpload';
import ProcessingOverlay from './ProcessingOverlay';
import ResultsDisplay from './ResultsDisplay';
import BulkProgressDisplay from './BulkProgressDisplay';
import { CheckCircleIcon, DollarSignIcon } from './Icons';

interface ReceiptScannerProps {
  onReceiptSave: (receipt: SavedReceiptData) => void;
  isOnline: boolean;
}

const currencies = {
    'USD': 'US Dollar',
    'INR': 'Indian Rupee',
    'GBP': 'British Pound',
    'AED': 'UAE Dirham'
};
type CurrencyCode = keyof typeof currencies;

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onReceiptSave, isOnline }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineSaveMessage, setOfflineSaveMessage] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  // State for bulk processing
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    completed: 0,
    errors: 0,
    currentFileName: '',
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };
  
  const handleSave = (receiptData: ReceiptData) => {
    const newReceipt: SavedReceiptData = {
        ...receiptData,
        id: Date.now(),
        status: 'synced'
    };
    onReceiptSave(newReceipt);
  }

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (isLoading || isBulkProcessing) return;

    // Reset common states
    setError(null);
    setOfflineSaveMessage(null);
    setExtractedData(null);

    // --- SINGLE FILE UPLOAD ---
    if (files.length === 1) {
      const file = files[0];
      setIsLoading(true);
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(previewUrl);

      try {
        const base64Image = await fileToBase64(file);
        
        if (isOnline) {
          const data = await extractReceiptData(base64Image, file.type, selectedCurrency);
          setExtractedData(data);
        } else {
          const pendingReceipt: SavedReceiptData = {
              id: Date.now(), status: 'pending_sync', merchant_name: 'Pending Sync',
              transaction_date: new Date().toISOString().split('T')[0], total_amount: 0,
              tax_amount: 0, line_items: [], imageData: base64Image, mimeType: file.type,
              currency: selectedCurrency
          };
          onReceiptSave(pendingReceipt);
          setOfflineSaveMessage("Receipt saved locally. It will sync when you're back online.");
          setTimeout(() => handleReset(), 3000);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to analyze receipt. ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // --- BULK FILE UPLOAD ---
    if (files.length > 1) {
      setIsBulkProcessing(true);
      setBulkProgress({ total: files.length, completed: 0, errors: 0, currentFileName: '' });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBulkProgress(prev => ({ ...prev, currentFileName: file.name, completed: i }));

        try {
          const base64Image = await fileToBase64(file);
          if (isOnline) {
            const data = await extractReceiptData(base64Image, file.type, selectedCurrency);
            // use Date.now() + i to prevent key collision if processed in same millisecond
            const newReceipt: SavedReceiptData = { ...data, id: Date.now() + i, status: 'synced' };
            onReceiptSave(newReceipt);
          } else {
            const pendingReceipt: SavedReceiptData = {
                id: Date.now() + i, status: 'pending_sync',
                merchant_name: `Pending: ${file.name.substring(0, 20)}...`,
                transaction_date: new Date().toISOString().split('T')[0],
                total_amount: 0, tax_amount: 0, line_items: [],
                imageData: base64Image, mimeType: file.type, currency: selectedCurrency
            };
            onReceiptSave(pendingReceipt);
          }
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
          setBulkProgress(prev => ({ ...prev, errors: prev.errors + 1 }));
        }
      }
       setBulkProgress(prev => ({ ...prev, completed: files.length, currentFileName: 'Finished' }));
    }
  }, [isLoading, isBulkProcessing, isOnline, onReceiptSave, selectedCurrency]);

  const handleReset = () => {
    setImageFile(null);
    setImagePreviewUrl(null);
    setExtractedData(null);
    setError(null);
    setIsLoading(false);
    setOfflineSaveMessage(null);
    setIsBulkProcessing(false);
    setBulkProgress({ total: 0, completed: 0, errors: 0, currentFileName: '' });
  };

  if (isBulkProcessing) {
    return <BulkProgressDisplay progress={bulkProgress} onDone={handleReset} />;
  }

  return (
    <div className="w-full relative">
      {isLoading && <ProcessingOverlay />}
      
      {!imagePreviewUrl && !isLoading && !offlineSaveMessage && (
        <div className="space-y-4">
            <div className="flex flex-col items-center">
                <label htmlFor="currency-select" className="block text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                    <DollarSignIcon className="w-5 h-5 text-slate-500" />
                    Select receipt currency before uploading
                </label>
                <select
                    id="currency-select"
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                    className="w-full max-w-xs bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                    {Object.entries(currencies).map(([code, name]) => (
                        <option key={code} value={code}>{name} ({code})</option>
                    ))}
                </select>
            </div>
            <FileUpload onFileUpload={handleFileUpload} />
        </div>
      )}

      {offlineSaveMessage && (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-800 border-2 border-dashed border-emerald-500 rounded-2xl">
          <CheckCircleIcon className="w-16 h-16 text-emerald-400 mb-4" />
          <h3 className="text-xl font-bold text-emerald-300">Success!</h3>
          <p className="text-slate-300 max-w-md">{offlineSaveMessage}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-center">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={handleReset}
            className="mt-2 px-4 py-1 bg-red-600 hover:bg-red-500 rounded text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {imagePreviewUrl && !isLoading && extractedData && (
        <ResultsDisplay
          imageUrl={imagePreviewUrl}
          initialData={extractedData}
          onScanAnother={handleReset}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default ReceiptScanner;