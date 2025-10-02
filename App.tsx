import React, { useState, useEffect, useCallback } from 'react';
import ReceiptScanner from './components/ReceiptScanner';
import SavedReceiptsList from './components/SavedReceiptsList';
import { ScanIcon, CloudOffIcon, RefreshCwIcon } from './components/Icons';
import type { SavedReceiptData } from './types';
import { extractReceiptData } from './services/geminiService';

function App() {
  const [savedReceipts, setSavedReceipts] = useState<SavedReceiptData[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    try {
      const storedReceipts = localStorage.getItem('savedReceipts');
      if (storedReceipts) {
        setSavedReceipts(JSON.parse(storedReceipts));
      }
    } catch (error) {
      console.error("Failed to load receipts from localStorage:", error);
    }
  }, []);

  const updateLocalStorage = (receipts: SavedReceiptData[]) => {
    try {
        localStorage.setItem('savedReceipts', JSON.stringify(receipts));
    } catch (error) {
        console.error("Failed to save receipts to localStorage:", error);
    }
  }

  const handleSync = useCallback(async (currentReceipts: SavedReceiptData[]) => {
      const pendingReceipts = currentReceipts.filter(r => r.status === 'pending_sync');
      if (pendingReceipts.length === 0 || !navigator.onLine) return;

      setIsSyncing(true);
      console.log(`Syncing ${pendingReceipts.length} receipts...`);

      let updatedReceipts = [...currentReceipts];

      for (const pending of pendingReceipts) {
          try {
              if (pending.imageData && pending.mimeType) {
                  const extracted = await extractReceiptData(pending.imageData, pending.mimeType, pending.currency);
                  const index = updatedReceipts.findIndex(r => r.id === pending.id);
                  if (index !== -1) {
                      const syncedReceipt: SavedReceiptData = {
                          ...extracted,
                          id: pending.id,
                          status: 'synced',
                      };
                      updatedReceipts[index] = syncedReceipt;
                  }
              }
          } catch (error) {
              console.error(`Failed to sync receipt ${pending.id}:`, error);
          }
      }
      
      setSavedReceipts(updatedReceipts);
      updateLocalStorage(updatedReceipts);
      setIsSyncing(false);
      console.log("Sync complete.");
  }, []);


  useEffect(() => {
    const goOnline = () => {
        setIsOnline(true);
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    
    return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    // Trigger sync when coming online or on initial load if online and there are receipts
    if (isOnline && savedReceipts.length > 0) {
      handleSync(savedReceipts);
    }
  }, [isOnline, savedReceipts, handleSync]);


  const handleAddReceipt = useCallback((receipt: SavedReceiptData) => {
    setSavedReceipts(prevReceipts => {
        const updatedReceipts = [...prevReceipts, receipt];
        updateLocalStorage(updatedReceipts);
        return updatedReceipts;
    });
  }, []);

  const handleDeleteReceipt = useCallback((id: number) => {
    setSavedReceipts(prevReceipts => {
        const updatedReceipts = prevReceipts.filter(r => r.id !== id);
        updateLocalStorage(updatedReceipts);
        return updatedReceipts;
    });
  }, []);


  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-7xl mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <ScanIcon className="w-8 h-8 text-cyan-400" />
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            AI Receipt Scanner
          </h1>
        </div>
        <p className="text-slate-400">
          Scan receipts with AI, track expenses, and export your data.
        </p>
         <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            {isSyncing && (
                <div className="flex items-center gap-2 text-sky-400 animate-pulse">
                    <RefreshCwIcon className="w-4 h-4 animate-spin" />
                    <span>Syncing offline receipts...</span>
                </div>
            )}
            {!isOnline && (
                <div className="flex items-center gap-2 text-amber-400">
                    <CloudOffIcon className="w-5 h-5" />
                    <span>Offline Mode</span>
                </div>
            )}
        </div>
      </header>
      <main className="w-full max-w-7xl flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
                <ReceiptScanner onReceiptSave={handleAddReceipt} isOnline={isOnline} />
            </div>
            <div className="lg:col-span-2">
                <SavedReceiptsList receipts={savedReceipts} onDelete={handleDeleteReceipt} />
            </div>
        </div>
      </main>
      <footer className="w-full max-w-7xl mt-8 text-center text-slate-500 text-sm">
        <p>&copy; 2024 AI Receipt Scanner. Built with React, TypeScript, and Gemini API.</p>
      </footer>
    </div>
  );
}

export default App;