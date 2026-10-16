"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Paperclip,
  Camera,
  ArrowRight,
  X,
  FileImage,
  Globe2,
  AlertCircle,
} from "lucide-react";
import BlurText from "./reactbits/BlurText";
import DecryptedText from "./reactbits/DecryptedText";
import Magnet from "./reactbits/Magnet";
import LiveCameraBox from "./scanner/LiveCameraBox";
import VerificationHUD from "./scanner/VerificationHUD";
import {
  DEMO_PRESETS,
  ScanResult,
  LanguageKey,
  BackendScanResponse,
  normalizeBackendScanResponse,
} from "./scanner/types";

const Hero = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeLang, setActiveLang] = useState<LanguageKey>("en");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis steps simulation
  const steps = [
    "Reading packaging label via Gemma 4 Vision...",
    "Querying NAFDAC Greenbook registry cross-checks...",
    "Checking crowd batch risk intelligence & geo-hotspots...",
    "Synthesizing plain-language verdict via AI agent...",
  ];

  const handleImageSelect = (file: File, autoSubmit = false) => {
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setIsLiveCameraOpen(false);
    setResult(null);
    setScanError(null);

    if (autoSubmit) {
      scanPackagingImage(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setScanError(null);
  };

  const scanPackagingImage = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setResult(null);
    setScanError(null);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1400);

    try {
      const formData = new FormData();
      formData.append("image", file);
      if (activeLang) {
        formData.append("lang", activeLang);
      }

      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || "";

      let res: Response;
      try {
        res = await fetch(`${apiBaseUrl}/api/scan`, {
          method: "POST",
          body: formData,
        });
      } catch (networkErr) {
        // Fallback to explicit direct port 5000 if same-origin proxy fails
        res = await fetch("http://127.0.0.1:5000/api/scan", {
          method: "POST",
          body: formData,
        });
      }

      if (!res.ok) {
        let msg = `Verification server returned status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.message) msg = errData.message;
        } catch {}
        throw new Error(msg);
      }

      const data: BackendScanResponse = await res.json();
      const normalized = normalizeBackendScanResponse(data);
      setResult(normalized);
    } catch (err: any) {
      console.error("Scan verification failed:", err);
      setScanError(
        err.message ||
          "Failed to scan packaging. Ensure backend server is running on port 5000.",
      );
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  const triggerPreset = (presetKey: string) => {
    const preset = DEMO_PRESETS[presetKey];
    if (!preset) return;
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setIsLiveCameraOpen(false);
    setScanError(null);
    startAnalysis(preset);
  };

  const handleImageSubmit = () => {
    if (selectedImage) {
      scanPackagingImage(selectedImage);
      return;
    }
    if (!result) {
      triggerPreset("coartem_genuine");
    }
  };

  const startAnalysis = (targetResult: ScanResult) => {
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setResult(null);
    setScanError(null);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          setTimeout(() => {
            setIsAnalyzing(false);
            setResult(targetResult);
          }, 350);
          return prev;
        }
      });
    }, 450);
  };

  const handleReset = () => {
    setResult(null);
    handleClearImage();
    setIsLiveCameraOpen(false);
    setScanError(null);
  };

  // Keyboard shortcut listener: Enter triggers verification
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isAnalyzing && selectedImage) {
        handleImageSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, isAnalyzing]);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-4 md:px-8">
      {/* Main Container */}
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center text-center">
        {/* Hero Title (Kraft-inspired typography with elegant italic keyword) */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white leading-[1.15]">
          <BlurText
            text="Verify with Genium"
            delay={40}
            className="block text-white"
          />
          <span className="block mt-1">
            the{" "}
            <span
              className="italic font-serif font-normal text-sky-400 px-1"
              style={{ fontFamily: "Georgia, serif" }}
            >
              future
            </span>{" "}
            of products safety
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-sm sm:text-base text-zinc-400 font-normal">
          Upload packaging photos to instantly detect cloned NAFDAC numbers and
          crowd-flagged batches.
        </p>

        {/* Big Perplexity/Kraft-style Minimal Input Box (Strictly Live Camera & Image Upload) */}
        <div className="mt-10 w-full max-w-3xl">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleImageSelect(e.dataTransfer.files[0], true);
              }
            }}
            className={`relative rounded-[32px] sm:rounded-[38px] bg-white text-zinc-900 border border-zinc-200/90 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5),0_0_1px_rgba(255,255,255,0.4)] transition-all duration-300 ${
              isDragging
                ? "ring-4 ring-sky-500/20 border-sky-400 bg-zinc-50/95"
                : "hover:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.6)]"
            }`}
          >
            {/* Live Camera Feed inside the box if active */}
            {isLiveCameraOpen ? (
              <div className="p-3 sm:p-4">
                <LiveCameraBox
                  onCapture={(file) => handleImageSelect(file, true)}
                  onClose={() => setIsLiveCameraOpen(false)}
                />
              </div>
            ) : (
              /* Main Interactive Image Zone */
              <div>
                {selectedImage && imagePreviewUrl ? (
                  /* Image Attached Preview Card */
                  <div className="px-5 pt-5 pb-3 sm:px-7 sm:pt-7 sm:pb-4">
                    <div className="w-full flex items-center justify-between gap-4 rounded-2xl border border-zinc-200/90 bg-zinc-50/90 p-3.5 sm:p-4 text-left shadow-xs">
                      <div className="flex items-center gap-3.5">
                        <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-zinc-200 bg-white shrink-0 shadow-xs">
                          <Image
                            src={imagePreviewUrl}
                            alt="Pack preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-900 max-w-[220px] sm:max-w-xs truncate">
                              {selectedImage.name}
                            </span>
                            <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-700">
                              {(selectedImage.size / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Photo ready. Press{" "}
                            <span className="font-semibold text-zinc-900 font-mono">
                              Enter
                            </span>{" "}
                            or click arrow to verify.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleClearImage}
                        className="rounded-full p-2 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors cursor-pointer"
                        title="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Clean Kraft Minimalist Placeholder (Click/Drop to upload) */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 pt-7 pb-4 sm:px-8 sm:pt-8 sm:pb-5 text-left cursor-pointer flex flex-col justify-start min-h-[110px] sm:min-h-[120px] select-none group"
                  >
                    <span className="text-zinc-400 font-normal text-lg sm:text-xl tracking-tight transition-colors group-hover:text-zinc-500">
                      Drop packaging photo or scan to verify...
                    </span>
                    <span className="text-xs text-zinc-400/80 font-normal mt-2">
                      Cross-checks NAFDAC Greenbook, batch registries &
                      packaging authenticity
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Hidden native file input for upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageSelect(e.target.files[0], true);
                }
              }}
            />

            {/* Bottom Toolbar inside the box (Matching Kraft design) */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 pb-4 sm:pb-5 pt-1">
              {/* Left Action Buttons & Preset Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Paperclip circular button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900 transition-all active:scale-95 cursor-pointer shadow-xs"
                  title="Attach packaging photo from device"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                {/* Camera circular button */}
                <button
                  type="button"
                  onClick={() => setIsLiveCameraOpen((prev) => !prev)}
                  className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full transition-all active:scale-95 cursor-pointer shadow-xs ${
                    isLiveCameraOpen
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900"
                  }`}
                  title={
                    isLiveCameraOpen
                      ? "Close Live Camera"
                      : "Open Live Web Camera"
                  }
                >
                  <Camera className="h-4 w-4" />
                </button>

                {/* Preset Pills (Kraft style like 'Create Design', 'Wireframe') */}
                <button
                  type="button"
                  onClick={() => triggerPreset("augmentin_clone")}
                  className="flex items-center gap-2 rounded-full bg-zinc-100 hover:bg-zinc-200/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Augmentin Clone</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerPreset("pepsi_bottle")}
                  className="flex items-center gap-2 rounded-full bg-zinc-100 hover:bg-zinc-200/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Pepsi 50cl</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerPreset("pepsi_fake")}
                  className="flex items-center gap-2 rounded-full bg-zinc-100 hover:bg-zinc-200/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                  <span>Fake Pepsi</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerPreset("coartem_genuine")}
                  className="flex items-center gap-2 rounded-full bg-zinc-100 hover:bg-zinc-200/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>Coartem Genuine</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerPreset("amatem_amber")}
                  className="hidden md:flex items-center gap-2 rounded-full bg-zinc-100 hover:bg-zinc-200/80 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-all cursor-pointer active:scale-95 shadow-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span>Chalky Batch</span>
                </button>
              </div>

              {/* Right: Language switch + Solid Black Circular Submit Arrow (Kraft style) */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Language switcher pill */}
                <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-1 text-xs text-zinc-500 shadow-xs">
                  <Globe2 className="h-3.5 w-3.5 ml-1 text-zinc-400 hidden sm:inline" />
                  {(["en", "yo", "pcm"] as LanguageKey[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                        activeLang === lang
                          ? "bg-white text-zinc-900 font-semibold shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Solid Blue Circular Button with ArrowRight (Identical to Kraft) */}
                <Magnet padding={25} magnetStrength={2}>
                  <button
                    type="button"
                    onClick={handleImageSubmit}
                    disabled={isAnalyzing}
                    className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-zinc-800 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Verify pack"
                  >
                    {isAnalyzing ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </Magnet>
              </div>
            </div>

            {/* Thinking / Analyzing Minimalistic Status Bar */}
            {isAnalyzing && (
              <div className="border-t border-zinc-100 bg-zinc-50/90 px-6 py-3 rounded-b-[32px] sm:rounded-b-[38px] flex items-center justify-between text-xs text-zinc-600">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600" />
                  </span>
                  <DecryptedText
                    text={steps[analysisStep]}
                    speed={25}
                    className="font-mono text-xs text-zinc-800 font-medium"
                  />
                </div>
                <span className="font-mono text-[11px] text-zinc-500 font-medium">
                  Step {analysisStep + 1}/4
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Scan Error Alert Banner */}
        {scanError && (
          <div className="mt-6 w-full max-w-3xl rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-left text-xs text-red-200 flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-white">
                  Packaging Verification Error
                </p>
                <p className="text-zinc-300 mt-0.5 leading-relaxed">
                  {scanError}
                </p>
              </div>
            </div>
            <button
              onClick={() => setScanError(null)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* VERIFICATION OUTCOME HUD (Rendered via clean modular component) */}
        {result && (
          <VerificationHUD
            result={result}
            activeLang={activeLang}
            onSelectLang={(lang) => setActiveLang(lang)}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default Hero;
