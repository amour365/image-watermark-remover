"use client";

import { useCallback, useState } from "react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function UploadZone({ onUpload }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndUpload = useCallback(
    (file: File) => {
      setError(null);
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Please upload a JPG, PNG, or WebP image.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File size must be under 10MB.");
        return;
      }
      onUpload(file);
    },
    [onUpload]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndUpload(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
  }

  return (
    <div
      className={`
        relative flex flex-col items-center justify-center
        border-2 border-dashed rounded-2xl p-12 cursor-pointer
        transition-all duration-200
        ${
          isDragging
            ? "border-violet-500 bg-violet-500/10 scale-[1.02]"
            : "border-slate-600 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900/80"
        }
      `}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="text-5xl mb-4">🖼️</div>
      <p className="text-lg font-medium mb-1">
        {isDragging ? "Drop your image here" : "Drag & drop your image"}
      </p>
      <p className="text-slate-400 text-sm mb-4">
        or{" "}
        <span className="text-violet-400 font-medium hover:underline">
          click to browse
        </span>
      </p>

      {error && (
        <p className="text-red-400 text-sm mt-2 bg-red-400/10 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
    </div>
  );
}
