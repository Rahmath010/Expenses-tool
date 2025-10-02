import React, { useMemo, useState } from 'react';
import type { SavedReceiptData } from '../types';
import { WalletIcon, TrashIcon, FilePdfIcon, SearchIcon, XCircleIcon, CloudOffIcon, UsersIcon, DollarSignIcon } from './Icons';

interface SavedReceiptsListProps {
  receipts: SavedReceiptData[];
  onDelete: (id: number) => void;
}
type CurrencyCode = 'USD' | 'INR' | 'GBP' | 'AED';

const allPossibleCurrencies: CurrencyCode[] = ['USD', 'INR', 'GBP', 'AED'];

const SavedReceiptsList: React.FC<SavedReceiptsListProps> = ({ receipts, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<'all' | CurrencyCode>('all');
    const [splitCount, setSplitCount] = useState<number>(1);

    const filteredReceipts = useMemo(() => {
        return receipts.filter(receipt => {
            const matchesSearchTerm = receipt.merchant_name.toLowerCase().includes(searchTerm.toLowerCase());
            
            const receiptDate = new Date(receipt.transaction_date + 'T00:00:00'); // Avoid timezone issues
            const start = startDate ? new Date(startDate + 'T00:00:00') : null;
            const end = endDate ? new Date(endDate + 'T00:00:00') : null;

            const matchesStartDate = start ? receiptDate >= start : true;
            const matchesEndDate = end ? receiptDate <= end : true;
            
            const matchesCurrency = selectedCurrency === 'all' || receipt.currency === selectedCurrency;

            return matchesSearchTerm && matchesStartDate && matchesEndDate && matchesCurrency;
        });
    }, [receipts, searchTerm, startDate, endDate, selectedCurrency]);
    
    const syncedReceipts = useMemo(() => {
        return filteredReceipts.filter(r => r.status === 'synced');
    }, [filteredReceipts]);

    const displayTotalsByCurrency = useMemo(() => {
        return syncedReceipts.reduce((totals, receipt) => {
            if (!totals[receipt.currency]) {
                totals[receipt.currency] = 0;
            }
            totals[receipt.currency] += receipt.total_amount;
            return totals;
        }, {} as Record<CurrencyCode, number>);
    }, [syncedReceipts]);

    const { canSplitTotal, splitCurrency, totalForSplitting } = useMemo(() => {
        if (selectedCurrency !== 'all') {
            return {
                canSplitTotal: true,
                splitCurrency: selectedCurrency,
                totalForSplitting: displayTotalsByCurrency[selectedCurrency] || 0,
            };
        }

        const currencyKeys = Object.keys(displayTotalsByCurrency) as CurrencyCode[];
        if (currencyKeys.length === 1) {
            const theOnlyCurrency = currencyKeys[0];
            return {
                canSplitTotal: true,
                splitCurrency: theOnlyCurrency,
                totalForSplitting: displayTotalsByCurrency[theOnlyCurrency] || 0,
            };
        }

        return { canSplitTotal: false, splitCurrency: null, totalForSplitting: 0 };
    }, [selectedCurrency, displayTotalsByCurrency]);

    const perPersonAmount = useMemo(() => {
        if (canSplitTotal && splitCount > 0 && totalForSplitting > 0) {
          return totalForSplitting / splitCount;
        }
        return 0;
    }, [totalForSplitting, splitCount, canSplitTotal]);

    const formatCurrency = (amount: number, currencyCode: CurrencyCode) => {
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
        } catch (error) {
            console.warn(`Could not format currency for ${currencyCode}. Falling back.`);
            return `${currencyCode} ${amount.toFixed(2)}`;
        }
    }

    const handleClearFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setSelectedCurrency('all');
    }

    const isAnyFilterActive = searchTerm || startDate || endDate || selectedCurrency !== 'all';

    const handleExportPdf = () => {
        try {
            const { jsPDF } = (window as any).jspdf;
            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4'
            });

            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const margin = 20;
            let yPosition = 0;

            const addHeader = (title: string) => {
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(title, margin, 15);
                const dateStr = new Date().toLocaleDateString();
                doc.text(`Generated: ${dateStr}`, pageWidth - margin, 15, { align: 'right' });
                doc.setLineWidth(0.2);
                doc.line(margin, 18, pageWidth - margin, 18);
            }
            
            const addFooter = () => {
                const pageCount = doc.internal.getNumberOfPages();
                for(let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setLineWidth(0.2);
                    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                }
            }
    
            addHeader("Expense Summary");
            doc.setFontSize(22);
            doc.setTextColor(40);
            doc.text("Expense Summary (Synced Only)", margin, 30);
            yPosition = 45;

            doc.setFontSize(14);
            doc.text(`Total Synced Receipts:`, margin, yPosition);
            doc.text(`${syncedReceipts.length}`, pageWidth - margin, yPosition, { align: 'right'});
            yPosition += 8;

            doc.setFont('helvetica', 'bold');
            doc.text(`Total Expenses by Currency:`, margin, yPosition);
            yPosition += 8;
            doc.setFont('helvetica', 'normal');
            Object.entries(displayTotalsByCurrency).forEach(([currency, total]) => {
                doc.text(`${currency}:`, margin + 5, yPosition);
                doc.text(formatCurrency(total, currency as CurrencyCode), pageWidth - margin, yPosition, {align: 'right'});
                yPosition += 7;
            });
            yPosition += 3;
            
            if (splitCount > 1 && canSplitTotal && splitCurrency) {
                doc.setLineWidth(0.2);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 10;
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`Split Between:`, margin, yPosition);
                doc.text(`${splitCount} people`, pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 8;
                doc.text(`Amount Per Person:`, margin, yPosition);
                doc.text(formatCurrency(perPersonAmount, splitCurrency), pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 10;
            }


            syncedReceipts.forEach(receipt => {
                const itemLines = receipt.line_items.reduce((acc, item) => acc + doc.splitTextToSize(item.description, 120).length, 0);
                const blockHeight = 35 + (itemLines * 5);

                if (yPosition + blockHeight > pageHeight - 25) {
                    doc.addPage();
                    addHeader("Expense Summary (cont.)");
                    yPosition = 30;
                }

                doc.setLineWidth(0.5);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 8;

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(receipt.merchant_name, margin, yPosition);
                doc.setFont('helvetica', 'normal');
                doc.text(receipt.transaction_date, pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 8;

                doc.setFontSize(11);
                doc.text(`Total: ${formatCurrency(receipt.total_amount, receipt.currency)}`, pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 6;
                doc.text(`Tax: ${formatCurrency(receipt.tax_amount, receipt.currency)}`, pageWidth - margin, yPosition, { align: 'right' });
                yPosition += 8;

                doc.setFont('helvetica', 'italic');
                doc.text("Items:", margin, yPosition);
                doc.setFont('helvetica', 'normal');
                yPosition += 6;

                receipt.line_items.forEach(item => {
                     if (yPosition > pageHeight - 25) {
                        doc.addPage();
                        addHeader("Expense Summary (cont.)");
                        yPosition = 30;
                    }
                    const splitDescription = doc.splitTextToSize(item.description, 120);
                    doc.text(splitDescription, margin + 5, yPosition);
                    doc.text(formatCurrency(item.amount, receipt.currency), pageWidth - margin, yPosition, { align: 'right' });
                    yPosition += (splitDescription.length * 5) + 2;
                });
                yPosition += 5;
            });

            addFooter();
            doc.save(`expense_summary_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("Failed to export PDF:", error);
            alert("Could not export the expense summary as a PDF.");
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 p-4 sm:p-6 rounded-2xl h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
                <WalletIcon className="w-7 h-7 text-sky-400" />
                <h2 className="text-2xl font-bold text-sky-400">My Expenses</h2>
            </div>
            
             {/* Filter Section */}
            <div className="bg-slate-900/50 p-3 rounded-lg mb-4 space-y-3">
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="Search by merchant..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input 
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                        aria-label="Start Date"
                    />
                    <input 
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                        aria-label="End Date"
                    />
                </div>
                 <div className="relative">
                    <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value as 'all' | CurrencyCode)}
                        className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg p-2 pl-10 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all appearance-none"
                        aria-label="Filter by currency"
                    >
                        <option value="all">All Currencies</option>
                        {allPossibleCurrencies.map(currency => (
                            <option key={currency} value={currency}>{currency}</option>
                        ))}
                    </select>
                    <DollarSignIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
                {isAnyFilterActive && (
                    <button onClick={handleClearFilters} className="w-full flex items-center justify-center gap-2 text-sm py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">
                        <XCircleIcon className="w-4 h-4" />
                        Clear Filters
                    </button>
                )}
            </div>
            
            {/* Summary & Actions Panel */}
            <div className="bg-slate-900/50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p className="text-sm text-slate-400">Receipts (Filtered)</p>
                        <p className="text-2xl font-bold text-slate-100">{filteredReceipts.length}</p>
                    </div>
                    <div className="text-right">
                         <p className="text-sm text-slate-400">Total Expenses</p>
                         <div className="space-y-1">
                            {Object.keys(displayTotalsByCurrency).length > 0 ? (
                                Object.entries(displayTotalsByCurrency).map(([currency, total]) => (
                                    <p key={currency} className="text-xl font-bold text-emerald-400">
                                        {formatCurrency(total, currency as CurrencyCode)}
                                    </p>
                                ))
                            ) : (
                                <p className="text-xl font-bold text-emerald-400">{formatCurrency(0, 'USD')}</p>
                            )}
                        </div>
                    </div>
                </div>

                {syncedReceipts.length > 0 && (
                    <div className="pt-4 border-t border-slate-700">
                        {canSplitTotal && splitCurrency ? (
                            <div>
                                <h3 className="text-lg font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                    <UsersIcon className="w-5 h-5 text-sky-400" />
                                    Split Total Expenses
                                </h3>
                                <div className="bg-slate-700/50 p-3 rounded-lg">
                                    <div className="flex items-center gap-4 mb-2">
                                        <label htmlFor="total-split-count" className="text-sm font-medium text-slate-400 whitespace-nowrap">
                                            People: <span className="font-bold text-lg text-slate-200">{splitCount}</span>
                                        </label>
                                        <input
                                            id="total-split-count"
                                            type="range"
                                            min="1"
                                            max="10"
                                            step="1"
                                            value={splitCount}
                                            onChange={(e) => setSplitCount(parseInt(e.target.value, 10))}
                                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                                        />
                                    </div>
                                    <div className="mt-3 text-center bg-slate-900/50 p-3 rounded-lg">
                                        <p className="text-sm text-slate-400">Each person pays</p>
                                        <p className="text-2xl font-bold text-sky-400">
                                            {formatCurrency(perPersonAmount, splitCurrency)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-sm text-slate-400 bg-slate-700/30 p-3 rounded-lg">
                               Select a single currency from the filter above to enable bill splitting.
                            </div>
                        )}
                    </div>
                )}
            </div>


            <div className="flex-grow space-y-3 overflow-y-auto pr-2 min-h-[200px]">
                {receipts.length > 0 && filteredReceipts.length === 0 && (
                     <div className="text-center text-slate-400 pt-10">
                        <p>No receipts match your filters.</p>
                        <p className="text-sm">Try adjusting your search or date range.</p>
                    </div>
                )}
                {receipts.length === 0 && (
                    <div className="text-center text-slate-400 pt-10">
                        <p>No saved receipts yet.</p>
                        <p className="text-sm">Scan and save a receipt to see it here.</p>
                    </div>
                )}
                {filteredReceipts.map(receipt => (
                    receipt.status === 'pending_sync' ? (
                        <div key={receipt.id} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center opacity-70 animate-pulse">
                            <div>
                                <p className="font-semibold text-slate-200 flex items-center gap-2">
                                    <CloudOffIcon className="w-5 h-5 text-amber-400" />
                                    Pending Sync ({receipt.currency})
                                </p>
                                <p className="text-sm text-slate-400">{receipt.transaction_date}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <button onClick={() => onDelete(receipt.id)} className="p-2 text-slate-400 hover:text-red-400 rounded-full hover:bg-red-900/50 transition-colors" aria-label={`Delete pending receipt from ${receipt.transaction_date}`}>
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div key={receipt.id} className="bg-slate-700/50 p-3 rounded-lg flex justify-between items-center transition-all hover:bg-slate-700">
                            <div>
                                <p className="font-semibold text-slate-200">{receipt.merchant_name}</p>
                                <p className="text-sm text-slate-400">{receipt.transaction_date}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="font-bold text-lg text-emerald-300">{formatCurrency(receipt.total_amount, receipt.currency)}</p>
                                <button onClick={() => onDelete(receipt.id)} className="p-2 text-slate-400 hover:text-red-400 rounded-full hover:bg-red-900/50 transition-colors" aria-label={`Delete receipt from ${receipt.merchant_name}`}>
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )
                ))}
            </div>

            {syncedReceipts.length > 0 && (
                <div className="pt-4 mt-auto border-t border-slate-700">
                     <button
                        onClick={handleExportPdf}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg text-white font-bold transition-colors"
                    >
                        <FilePdfIcon className="w-5 h-5" />
                        Export Filtered as PDF
                    </button>
                </div>
            )}
        </div>
    );
};

export default SavedReceiptsList;