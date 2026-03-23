"use client";

import { useState } from "react";

interface ResultViewProps {
  originalUrl: string;
  resultUrl: string;
  onClose: () => void;
  onDownload: () => void;
}

export default function ResultView({
  originalUrl,
  resultUrl,
  onClose,
  onDownload,
}: ResultViewProps) {
  const [showResult, setShowResult] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl p-6 max-w-4xl w-full mx-4 shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Result</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Comparison toggle */}
        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={() => setShowResult(false)}
            className={`px-4 py-1.5 rounded-full text-sm transition ${
              !showResult
                ? "gradient-bg text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setShowResult(true)}
            className={`px-4 py-1.5 rounded-full text-sm transition ${
              showResult
                ? "gradient-bg text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            Result
          </button>
        </div>

        {/* Image display */}
        <div className="relative rounded-xl overflow-hidden bg-slate-950">
          <img
            src={showResult ? resultUrl : originalUrl}
            alt={showResult ? "Result" : "Original"}
            className="w-full max-h-[60vh] object-contain mx-auto"
          />
        </div>

        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Edit More
          </button>
          <button
            onClick={onDownload}
            className="px-6 py-2.5 rounded-lg text-sm font-medium gradient-bg hover:opacity-90 text-white transition flex items-center gap-2"
          >
            ⬇ Download
          </button>
        </div>
      </div>
    </div>
  );
}
