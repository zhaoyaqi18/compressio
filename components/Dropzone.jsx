'use client';
import { useRef, useState } from 'react';

export default function Dropzone({ onFiles, accept = 'image/*,.heic,.heif,.avif', multiple = false, disabled = false, title = 'Drop your images here', subtitle = 'or click to browse' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      role="button" tabIndex={0} aria-label={title}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled && e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <svg className={`h-10 w-10 ${dragging ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
