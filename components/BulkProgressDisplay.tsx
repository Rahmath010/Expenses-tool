import React from 'react';
import { CheckCircleIcon, XCircleIcon, RefreshIcon } from './Icons';

interface BulkProgressDisplayProps {
  progress: {
    total: number;
    completed: number;
    errors: number;
    currentFileName: string;
  };
  onDone: () => void;
}

const BulkProgressDisplay: React.FC<BulkProgressDisplayProps> = ({ progress, onDone }) => {
  const { total, completed, errors, currentFileName } = progress;
  const isFinished = completed === total && total > 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const successful = total - errors;

  return (
    <div className="w-full bg-slate-800/50 border border-slate-700 p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center text-center animate-fade-in">
      {isFinished ? (
        <>
          <CheckCircleIcon className="w-16 h-16 text-emerald-400 mb-4" />
          <h2 className="text-2xl font-bold text-emerald-300">Upload Complete</h2>
          <p className="text-slate-300 mt-2 mb-6">
            All files have been processed.
          </p>
          <div className="flex justify-center gap-6 text-lg bg-slate-900/50 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
              <span><span className="font-bold">{successful}</span> Successful</span>
            </div>
             {errors > 0 && (
                <div className="flex items-center gap-2">
                    <XCircleIcon className="w-6 h-6 text-red-400" />
                    <span><span className="font-bold">{errors}</span> Failed</span>
                </div>
             )}
          </div>
          <button
            onClick={onDone}
            className="w-full max-w-xs mt-8 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 font-bold transition-colors"
          >
            <RefreshIcon className="w-5 h-5" />
            Scan More
          </button>
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-sky-300 mb-2">Processing Batch</h2>
          <p className="text-slate-400 mb-6">
            Analyzing your receipts one by one. Please wait.
          </p>
          
          <div className="w-full max-w-md">
            <div className="flex justify-between items-center mb-1 text-sm font-medium text-slate-300">
              <span>Progress</span>
              <span>{completed} / {total}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <p className="text-slate-400 mt-3 h-5 truncate" title={currentFileName}>
              {currentFileName ? `Processing: ${currentFileName}` : 'Initializing...'}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default BulkProgressDisplay;