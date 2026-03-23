"use client";

interface ToolbarProps {
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: () => void;
  onRemove: () => void;
  onBack: () => void;
  onDownload: () => void;
  isProcessing: boolean;
  hasResult: boolean;
}

export default function Toolbar({
  brushSize,
  onBrushSizeChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onReset,
  onRemove,
  onBack,
  onDownload,
  isProcessing,
  hasResult,
}: ToolbarProps) {
  return (
    <>
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          {hasResult && (
            <button
              onClick={onDownload}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              Download
            </button>
          )}
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            disabled={isProcessing}
          >
            Reset
          </button>
          <button
            onClick={onRemove}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg text-sm font-medium gradient-bg hover:opacity-90 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Processing...
              </>
            ) : (
              "Remove"
            )}
          </button>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-center gap-6 px-4 py-3 border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky bottom-0 z-10">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400 whitespace-nowrap">
            Brush Size
          </label>
          <input
            type="range"
            min={5}
            max={100}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            className="w-32 accent-violet-500"
          />
          <span className="text-sm text-slate-300 w-8">{brushSize}px</span>
        </div>

        <div className="w-px h-6 bg-slate-700" />

        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↩ Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ↪ Redo
          </button>
        </div>
      </div>
    </>
  );
}
