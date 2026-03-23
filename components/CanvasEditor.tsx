"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, FabricImage } from "fabric";

interface CanvasEditorProps {
  imageUrl: string;
  brushSize: number;
  onUndoUpdate: (canUndo: boolean, canRedo: boolean) => void;
  resultImageUrl: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFabric = any;

export default function CanvasEditor({
  imageUrl,
  brushSize,
  onUndoUpdate,
  resultImageUrl,
}: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const originalImageRef = useRef<AnyFabric>(null);
  const resultLayerRef = useRef<AnyFabric>(null);
  const [isReady, setIsReady] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);

  const saveState = useCallback(() => {
    if (!fabricRef.current || isRestoringRef.current) return;
    const json = JSON.stringify(fabricRef.current.toJSON());
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
    onUndoUpdate(historyIndexRef.current > 0, false);
  }, [onUndoUpdate]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0 || !fabricRef.current) return;
    isRestoringRef.current = true;
    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];
    fabricRef.current.loadFromJSON(JSON.parse(state)).then(() => {
      fabricRef.current!.renderAll();
      isRestoringRef.current = false;
      onUndoUpdate(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
    });
  }, [onUndoUpdate]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricRef.current) return;
    isRestoringRef.current = true;
    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];
    fabricRef.current.loadFromJSON(JSON.parse(state)).then(() => {
      fabricRef.current!.renderAll();
      isRestoringRef.current = false;
      onUndoUpdate(historyIndexRef.current > 0, historyIndexRef.current < historyRef.current.length - 1);
    });
  }, [onUndoUpdate]);

  // Expose to parent window
  useEffect(() => {
    const w = window as AnyFabric;
    w._canvasUndo = handleUndo;
    w._canvasRedo = handleRedo;
  }, [handleUndo, handleRedo]);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    const canvas = new Canvas(canvasRef.current, {
      width: Math.max(width, 300),
      height: Math.max(height, 300),
      selection: false,
      backgroundColor: "#0f0f23",
    });

    fabricRef.current = canvas;

    // Enable free drawing mode
    canvas.isDrawingMode = true;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = "rgba(255, 0, 0, 0.6)";
      canvas.freeDrawingBrush.width = brushSize;
    }

    canvas.on("path:created", () => {
      saveState();
    });

    setIsReady(true);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load image when URL changes
  useEffect(() => {
    if (!fabricRef.current || !isReady) return;

    const canvas = fabricRef.current;
    canvas.clear();
    canvas.backgroundColor = "#0f0f23";
    canvas.isDrawingMode = true;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = "rgba(255, 0, 0, 0.6)";
      canvas.freeDrawingBrush.width = brushSize;
    }
    historyRef.current = [];
    historyIndexRef.current = -1;

    FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" })
      .then((img) => {
        if (!fabricRef.current || !containerRef.current) return;

        const cvs = fabricRef.current;
        const containerW = containerRef.current.getBoundingClientRect().width || 600;
        const containerH = containerRef.current.getBoundingClientRect().height || 400;

        const scale = Math.min(
          containerW / (img.width || 1),
          containerH / (img.height || 1),
          1
        );

        img.scale(scale);
        img.set({
          left: (containerW - (img.width || 0) * scale) / 2,
          top: (containerH - (img.height || 0) * scale) / 2,
          selectable: false,
          evented: false,
          hasBorders: false,
        } as AnyFabric);

        originalImageRef.current = img;
        cvs.add(img);
        cvs.renderAll();
        saveState();
      })
      .catch((err) => {
        console.error("Failed to load image:", err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, isReady]);

  // Update brush size
  useEffect(() => {
    if (!fabricRef.current?.freeDrawingBrush) return;
    fabricRef.current.freeDrawingBrush.color = "rgba(255, 0, 0, 0.6)";
    fabricRef.current.freeDrawingBrush.width = brushSize;
  }, [brushSize]);

  // Get mask data URL
  const getMaskDataUrl = useCallback((): string | null => {
    if (!fabricRef.current || !originalImageRef.current) return null;

    const canvas = fabricRef.current;
    const img = originalImageRef.current;
    const canvasEl = canvas.getElement();

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvasEl.width;
    maskCanvas.height = canvasEl.height;
    const maskCtx = maskCanvas.getContext("2d")!;

    // Fill black (transparent = no mask)
    maskCtx.fillStyle = "#000000";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw paths as white (mask area)
    const paths = canvas.getObjects().filter((obj) => obj.type === "path") as AnyFabric[];
    maskCtx.fillStyle = "#FFFFFF";

    paths.forEach((path) => {
      const pathData = path.path;
      if (!pathData) return;

      const left = img.left || 0;
      const top = img.top || 0;
      const sx = img.scaleX || 1;
      const sy = img.scaleY || 1;

      const fabricUtil = (window as AnyFabric).fabric?.util;
      if (!fabricUtil) return;

      const svgPath = fabricUtil.joinPath(pathData);
      const tempPath = new (window as AnyFabric).fabric.Path(svgPath, {
        left: path.left || 0,
        top: path.top || 0,
        scaleX: path.scaleX || 1,
        scaleY: path.scaleY || 1,
        fill: "#FFFFFF",
        stroke: "#FFFFFF",
        strokeWidth: 0,
      });

      tempPath.left = left + (path.left || 0) * sx;
      tempPath.top = top + (path.top || 0) * sy;
      tempPath.scaleX = sx * (path.scaleX || 1);
      tempPath.scaleY = sy * (path.scaleY || 1);
      tempPath.transform = path.transform;
      tempPath._render(maskCtx);
    });

    return maskCanvas.toDataURL("image/png");
  }, []);

  // Show result image
  useEffect(() => {
    if (!fabricRef.current || !resultImageUrl || !isReady) return;

    const canvas = fabricRef.current;
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (obj === originalImageRef.current || obj.type === "path") {
        obj.visible = false;
      }
    });

    FabricImage.fromURL(resultImageUrl, { crossOrigin: "anonymous" })
      .then((img) => {
        if (!fabricRef.current || !originalImageRef.current) return;
        const origImg = originalImageRef.current;
        const scale = origImg.scaleX || 1;
        img.set({
          left: origImg.left,
          top: origImg.top,
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
          hasBorders: false,
        } as AnyFabric);
        resultLayerRef.current = img;
        canvas.add(img);
        canvas.renderAll();
      })
      .catch((err) => {
        console.error("Failed to load result:", err);
      });
  }, [resultImageUrl, isReady]);

  // Reset
  const handleReset = useCallback(() => {
    if (!fabricRef.current || !originalImageRef.current) return;
    const canvas = fabricRef.current;
    const objects = canvas.getObjects();
    objects.forEach((obj) => {
      if (obj !== originalImageRef.current && obj !== resultLayerRef.current) {
        canvas.remove(obj);
      }
    });
    if (resultLayerRef.current) {
      canvas.remove(resultLayerRef.current);
      resultLayerRef.current = null;
    }
    originalImageRef.current.visible = true;
    canvas.renderAll();
    historyRef.current = [];
    historyIndexRef.current = -1;
    onUndoUpdate(false, false);
  }, [onUndoUpdate]);

  useEffect(() => {
    const w = window as AnyFabric;
    w._getMaskDataUrl = getMaskDataUrl;
    w._canvasReset = handleReset;
  }, [getMaskDataUrl, handleReset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex-1 overflow-hidden">
      <canvas ref={canvasRef} />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-400">Loading editor...</p>
        </div>
      )}
    </div>
  );
}
