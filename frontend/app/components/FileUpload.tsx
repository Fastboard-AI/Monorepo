"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing?: boolean;
}

export function FileUpload({ onFilesSelected, isProcessing = false }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.type === "application/pdf" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          file.name.endsWith(".pdf") ||
          file.name.endsWith(".docx")
      );

      if (files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files]);
        onFilesSelected([...selectedFiles, ...files]);
      }
    },
    [onFilesSelected, selectedFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        setSelectedFiles((prev) => [...prev, ...files]);
        onFilesSelected([...selectedFiles, ...files]);
      }
    },
    [onFilesSelected, selectedFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
      onFilesSelected(newFiles);
    },
    [selectedFiles, onFilesSelected]
  );

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200
          ${isDragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
          }
          ${isProcessing ? "pointer-events-none opacity-60" : "cursor-pointer"}
        `}
      >
        <input
          type="file"
          multiple
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`
            flex h-16 w-16 items-center justify-center rounded-xl transition-colors
            ${isDragActive ? "bg-indigo-100" : "bg-indigo-50"}
          `}>
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            ) : (
              <Upload className="h-8 w-8 text-indigo-600" />
            )}
          </div>

          <div>
            <p className="text-lg font-semibold text-slate-900">
              {isProcessing ? "Processing resumes..." : "Drop resumes here"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isProcessing
                ? "Extracting candidate information"
                : "or click to browse (PDF, DOCX)"}
            </p>
          </div>

          {!isProcessing && (
            <button
              type="button"
              className="btn-lift rounded-full gradient-bg px-6 py-2.5 text-sm font-semibold text-white shadow-button"
            >
              Select Files
            </button>
          )}
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-slate-700">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-card"
              >
                <FileText className="h-4 w-4 text-indigo-600" />
                <span className="max-w-[200px] truncate text-slate-700">
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-1 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
