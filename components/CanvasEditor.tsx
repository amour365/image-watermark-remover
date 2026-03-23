"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, FabricImage, Path } from "fabric";

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
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);

  // Update dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const width = Math.max(rect.width, 300) || 600;
    const height = Math.max(rect.height, 300) || 400;

    const canvasEl = canvasRef.current;
    canvasEl.width = width;
    canvasEl.height = height;

    const canvas = new Canvas(canvasEl, {
      width,
      height,
      selection: false,
      backgroundColor: "#1a1a2e",
    });

    fabricRef.current = canvas;

    // Enable free drawing mode
    canvas.isDrawingMode = true;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = "rgba(255, 100, 100, 0.8)";
      canvas.freeDrawingBrush.width = brushSize;
    }

    canvas.on("path:created", (e: AnyFabric) => {
      console.log("Path created!", e);
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
    canvas.backgroundColor = "#1a1a2e";
    canvas.isDrawingMode = true;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = "rgba(255, 100, 100, 0.8)";
      canvas.freeDrawingBrush.width = brushSize;
    }
    historyRef.current = [];
    historyIndexRef.current = -1;

    FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" })
      .then((img) => {
        if (!fabricRef.current || !containerRef.current) return;

        const cvs = fabricRef.current;
        const containerW = dimensions.width;
        const containerH = dimensions.height;

        const scale = Math.min(
          containerW / (img.width || 1),
          containerH / (img.height || 1),
          1
        );

        const scaledW = (img.width || 0) * scale;
        const scaledH = (img.height || 0) * scale;

        img.scale(scale);
        img.set({
          left: (containerW - scaledW) / 2,
          top: (containerH - scaledH) / 2,
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
  }, [imageUrl, isReady, dimensions]);

  // Update brush size
  useEffect(() => {
    if (!fabricRef.current) return;
    fabricRef.current.isDrawingMode = true;
    if (fabricRef.current.freeDrawingBrush) {
      fabricRef.current.freeDrawingBrush.color = "rgba(255, 100, 100, 0.8)";
      fabricRef.current.freeDrawingBrush.width = brushSize;
    }
  }, [brushSize]);

  // Get mask data URL - simplified approach
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

    // Get paths and draw them as white
    const paths = canvas.getObjects().filter((obj: AnyFabric) => obj.type === "path") as AnyFabric[];

    if (paths.length === 0) {
      console.log("No paths found on canvas");
      return null;
    }

    maskCtx.fillStyle = "#FFFFFF";
    maskCtx.strokeStyle = "#FFFFFF";
    maskCtx.lineWidth = 2;

    const imgLeft = img.left || 0;
    const imgTop = img.top || 0;
    const sx = img.scaleX || 1;
    const sy = img.scaleY || 1;

    paths.forEach((path: AnyFabric) => {
      const pathData = path.path;
      if (!pathData) return;

      // Convert Fabric path to SVG path string
      let d = "";
      pathData.forEach((segment: AnyFabric) => {
        if (!segment || !Array.isArray(segment)) return;
        const cmd = segment[0];
        const args = segment.slice(1);
        if (cmd === "M") d += `M ${args[0]} ${args[1]} `;
        else if (cmd === "L") d += `L ${args[0]} ${args[1]} `;
        else if (cmd === "Q") d += `Q ${args[0]} ${args[1]} ${args[2]} ${args[3]} `;
        else if (cmd === "C") d += `C ${args[0]} ${args[1]} ${args[2]} ${args[3]} ${args[4]} ${args[5]} `;
        else if (cmd === "A") d += `A ${args[0]} ${args[1]} ${args[2]} ${args[3]} ${args[4]} ${args[5]} ${args[6]} `;
        else if (cmd === "Z" || cmd === "z") d += "Z ";
      });

      if (!d) return;

      const path2d = new Path(d, {
        left: path.left || 0,
        top: path.top || 0,
        scaleX: path.scaleX || 1,
        scaleY: path.scaleY || 1,
      } as AnyFabric);

      const absX = imgLeft + (path2d.left || 0) * sx;
      const absY = imgTop + (path2d.top || 0) * sy;
      const absScaleX = sx * (path.scaleX || 1);
      const absScaleY = sy * (path.scaleY || 1);

      maskCtx.save();
      maskCtx.translate(absX, absY);
      maskCtx.scale(absScaleX, absScaleY);

      const pathEl = new Path(d, { left: 0, top: 0 } as AnyFabric);
      const pathCanvas = pathEl.toCanvasElement();
      maskCtx.drawImage(pathCanvas, 0, 0);
      maskCtx.restore();
    });

    return maskCanvas.toDataURL("image/png");
  }, []);

  // Show result image
  useEffect(() => {
    if (!fabricRef.current || !resultImageUrl || !isReady) return;

    const canvas = fabricRef.current;
    const objects = canvas.getObjects();
    objects.forEach((obj: AnyFabric) => {
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
    objects.forEach((obj: AnyFabric) => {
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

  // Expose functions to window
  useEffect(() => {
    const w = window as AnyFabric;
    w._canvasUndo = handleUndo;
    w._canvasRedo = handleRedo;
    w._getMaskDataUrl = getMaskDataUrl;
    w._canvasReset = handleReset;
    w._canvasDebug = () => {
      if (!fabricRef.current) return "No canvas";
      const paths = fabricRef.current.getObjects().filter((o: AnyFabric) => o.type === "path");
      return {
        isDrawingMode: fabricRef.current.isDrawingMode,
        pathCount: paths.length,
        canvasWidth: fabricRef.current.width,
        canvasHeight: fabricRef.current.height,
        brushWidth: fabricRef.current.freeDrawingBrush?.width,
      };
    };
  }, [handleUndo, handleRedo, getMaskDataUrl, handleReset]);

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
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ minWidth: "300px", minHeight: "300px" }}
    >
      <canvas ref={canvasRef} />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-400">Loading editor...</p>
        </div>
      )}
    </div>
  );
}
