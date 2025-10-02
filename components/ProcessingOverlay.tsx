
import React, { useState, useEffect } from 'react';
import { ScanIcon, BrainCircuitIcon } from './Icons';

const messages = [
  "Initializing AI Engine...",
  "Analyzing receipt layout...",
  "Performing optical character recognition...",
  "Extracting line items...",
  "Verifying total amount...",
  "Finalizing results...",
];

const ProcessingOverlay: React.FC = () => {
  const [currentMessage, setCurrentMessage] = useState(messages[0]);

  useEffect(() => {
    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setCurrentMessage(messages[messageIndex]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-2xl overflow-hidden">
      <style>{`
        @keyframes hologram-scan {
          0% { transform: translateY(-100%); opacity: 0; }
          20%, 80% { opacity: 0.8; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .scanning-laser {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #00ff88, transparent);
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.7);
          animation: hologram-scan 2.5s ease-in-out infinite;
        }
      `}</style>
      <div className="relative w-48 h-48 border-2 border-cyan-400/30 rounded-lg flex items-center justify-center">
        <div className="scanning-laser"></div>
        <BrainCircuitIcon className="w-24 h-24 text-cyan-400 opacity-60 animate-pulse" />
      </div>
      <p className="mt-6 text-lg font-semibold text-emerald-300">{currentMessage}</p>
      <p className="text-slate-400">Please wait a moment.</p>
    </div>
  );
};

export default ProcessingOverlay;
