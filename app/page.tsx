"use client";

import { useRouter } from "next/navigation";
import UploadZone from "@/components/UploadZone";

export default function Home() {
  const router = useRouter();

  function handleUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const encoded = encodeURIComponent(dataUrl);
      router.push(`/editor?image=${encoded}`);
    };
    reader.readAsDataURL(file);
  }

  return (
    <main className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <div className="text-xl font-bold gradient-text">WatermarkGone</div>
        <nav className="flex gap-6 text-sm text-slate-400">
          <a href="#how-it-works" className="hover:text-white transition">
            How it works
          </a>
          <a
            href="https://replicate.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition"
          >
            Powered by AI
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 gap-8">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            <span className="gradient-text">Remove Watermarks</span>
            <br />
            with One Click
          </h1>
          <p className="text-slate-400 text-lg">
            Upload your image, brush over the watermark, and let AI do the
            rest. Fast, free, and works in your browser.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="w-full max-w-xl">
          <UploadZone onUpload={handleUpload} />
        </div>

        <p className="text-slate-500 text-sm">
          Supports JPG, PNG, WebP · Max 10MB
        </p>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-20 px-4 border-t border-slate-800/50"
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Upload Image",
                desc: "Drag & drop or click to upload your image (JPG, PNG, WebP up to 10MB)",
                icon: "📤",
              },
              {
                step: "2",
                title: "Brush Over Watermark",
                desc: "Use the brush tool to paint over the watermark area you want removed",
                icon: "🖌️",
              },
              {
                step: "3",
                title: "Download Result",
                desc: "AI processes your image and removes the watermark. Download instantly.",
                icon: "✨",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition"
              >
                <span className="text-4xl mb-4">{item.icon}</span>
                <div className="gradient-bg text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
                  Step {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-6 px-4 text-center text-slate-500 text-sm">
        © 2026 WatermarkGone · Built with Next.js &amp; Replicate AI
      </footer>
    </main>
  );
}
