"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Toolbar from "@/components/Toolbar";
import ResultView from "@/components/ResultView";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFabric = any;

// Dynamic import to avoid SSR issues with Fabric.js
const CanvasEditor = dynamic(() => import("@/components/CanvasEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading editor...</p>
      </div>
    </div>
  ),
});

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imageParam = searchParams.get("image") || "";

  const [brushSize, setBrushSize] = useState(30);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = decodeURIComponent(imageParam);

  const handleUndo = useCallback(() => {
    const w = window as AnyFabric;
    w._canvasUndo?.();
  }, []);

  const handleRedo = useCallback(() => {
    const w = window as AnyFabric;
    w._canvasRedo?.();
  }, []);

  const handleUndoUpdate = useCallback((canUndo: boolean, canRedo: boolean) => {
    setCanUndo(canUndo);
    setCanRedo(canRedo);
  }, []);

  const handleReset = useCallback(() => {
    (window as AnyFabric)._canvasReset?.();
    setResultImageUrl(null);
    setShowResult(false);
    setError(null);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!imageUrl) return;
    setIsProcessing(true);
    setError(null);

    const maskDataUrl = (window as AnyFabric)._getMaskDataUrl?.() as string | null;

    if (!maskDataUrl) {
      setError("Please brush over the watermark area first.");
      setIsProcessing(false);
      return;
    }

    try {
      const response = await fetch("/api/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageUrl,
          mask: maskDataUrl,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Inpainting failed");
      }

      const data = await response.json();
      setResultImageUrl(data.result);
      setShowResult(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  }, [imageUrl]);

  const handleDownload = useCallback(() => {
    if (!resultImageUrl) return;
    const a = document.createElement("a");
    a.href = resultImageUrl;
    a.download = "watermark-removed.png";
    a.click();
  }, [resultImageUrl]);

  const handleBack = useCallback(() => {
    router.push("/");
  }, [router]);

  // Keyboard shortcut for Remove
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isProcessing) {
        handleRemove();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRemove, isProcessing]);

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-400">No image provided.</p>
        <button onClick={handleBack} className="ml-4 text-violet-400 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Top toolbar */}
      <Toolbar
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onReset={handleReset}
        onRemove={handleRemove}
        onBack={handleBack}
        onDownload={handleDownload}
        isProcessing={isProcessing}
        hasResult={!!resultImageUrl}
      />

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden relative">
        <CanvasEditor
          imageUrl={imageUrl}
          brushSize={brushSize}
          onUndoUpdate={handleUndoUpdate}
          resultImageUrl={resultImageUrl}
        />
      </div>

      {/* Hint */}
      <div className="text-center py-2 text-xs text-slate-600">
        Brush over the watermark area · Press Enter or click Remove to process
      </div>

      {/* Result modal */}
      {showResult && resultImageUrl && (
        <ResultView
          originalUrl={imageUrl}
          resultUrl={resultImageUrl}
          onClose={() => setShowResult(false)}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-slate-950">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Loading...</p>
          </div>
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
