import { useCallback, useRef, useState } from 'react';
import { ACCEPTED_EXTENSIONS, isAcceptedFile } from '../lib/fileParser';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  currentFileName?: string;
  disabled?: boolean;
}

export default function FileUpload({ onFileSelected, currentFileName, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!isAcceptedFile(file)) {
        setLocalError(`"${file.name}" isn't a supported file type. Use .csv, .xlsx, or .xls.`);
        return;
      }
      setLocalError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a user story file"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2
          border-dashed px-6 py-10 text-center transition-colors
          ${isDragging ? 'border-brand bg-brand-light/40' : 'border-line bg-white'}
          ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand hover:bg-brand-light/20'}`}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-3 text-brand"
          aria-hidden="true"
        >
          <path
            d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="font-display text-base font-semibold text-ink">
          Drop your story file here, or click to browse
        </p>
        <p className="mt-1 text-sm text-muted">
          Supports {ACCEPTED_EXTENSIONS.join(', ')} — one story per row
        </p>
        {currentFileName && (
          <p className="mt-3 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand-dark">
            Loaded: {currentFileName}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {localError && <p className="mt-2 text-sm text-warn">{localError}</p>}
    </div>
  );
}
