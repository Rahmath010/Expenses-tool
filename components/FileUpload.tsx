import React, { useState, useCallback, useRef } from 'react';
import { UploadIcon, FilesIcon } from './Icons';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(Array.from(e.dataTransfer.files));
    }
  }, [onFileUpload]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(Array.from(e.target.files));
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const dragClass = isDragging ? 'border-emerald-400 bg-slate-700/50 scale-105' : 'border-slate-600 bg-slate-800/50';

  return (
    <div
      className={`relative w-full p-8 sm:p-12 border-2 border-dashed ${dragClass} rounded-2xl text-center cursor-pointer transition-all duration-300 ease-in-out`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleChange}
        multiple
      />
      <div className="flex flex-col items-center justify-center">
        <div className="flex -space-x-4">
            <UploadIcon className="w-12 h-12 mb-4 text-slate-400 translate-x-2" />
            <FilesIcon className="w-12 h-12 mb-4 text-slate-500 -translate-x-2" />
        </div>
        <p className="text-lg font-semibold text-slate-200">
          Drag & Drop your receipts here
        </p>
        <p className="text-slate-400 mt-1">or click to browse (you can select multiple files)</p>
        <p className="text-xs text-slate-500 mt-4">Supports: PNG, JPG, WEBP</p>
      </div>
    </div>
  );
};

export default FileUpload;