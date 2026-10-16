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
} from "lucide-react";
import BlurText from "./reactbits/BlurText";
import DecryptedText from "./reactbits/DecryptedText";
import Magnet from "./reactbits/Magnet";
import LiveCameraBox from "./scanner/LiveCameraBox";
import VerificationHUD from "./scanner/VerificationHUD";
import { DEMO_PRESETS, ScanResult, LanguageKey } from "./scanner/types";

const Hero = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeLang, setActiveLang] = useState<LanguageKey>("en");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis steps simulation
  const steps = [
    "Reading packaging label via Gemma 4 Vision...",
    "Querying NAFDAC Greenbook registry cross-checks...",
    "Checking crowd batch risk intelligence & geo-hotspots...",
    "Synthesizing plain-language verdict in 5 languages...",
  ];

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setIsLiveCameraOpen(false);
    setResult(null);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const triggerPreset = (presetKey: string) => {
    const preset = DEMO_PRESETS[presetKey];
    if (!preset) return;
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setIsLiveCameraOpen(false);
    startAnalysis(preset);
  };

  const handleImageSubmit = () => {
    if (!selectedImage && !result) {
      startAnalysis(DEMO_PRESETS.coartem_genuine);
      return;
    }
    startAnalysis(DEMO_PRESETS.coartem_genuine);
  };

  const startAnalysis = (targetResult: ScanResult) => {
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setResult(null);

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
            text="Verify with Genium —"
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
            {/* of medicine safety */}
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
                handleImageSelect(e.dataTransfer.files[0]);
              }
            }}
            className={`relative rounded-3xl border transition-all duration-300 ${
              isDragging
                ? "border-sky-400 bg-sky-950/20 shadow-[0_0_30px_rgba(14,165,233,0.2)]"
                : isAnalyzing
                  ? "border-sky-500/50 shadow-[0_0_40px_rgba(14,165,233,0.15)] bg-zinc-950/95"
                  : "border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-2xl hover:border-white/20"
            }`}
          >
            {/* Live Camera Feed inside the box if active */}
            {isLiveCameraOpen ? (
              <div className="p-3 sm:p-4">
                <LiveCameraBox
                  onCapture={(file) => handleImageSelect(file)}
                  onClose={() => setIsLiveCameraOpen(false)}
                />
              </div>
            ) : (
              /* Main Interactive Image Zone */
              <div className="p-6 sm:p-8 text-center flex flex-col items-center justify-center min-h-[140px]">
                {selectedImage && imagePreviewUrl ? (
                  /* Image Attached Preview Card */
                  <div className="w-full flex items-center justify-between gap-4 rounded-2xl border border-sky-500/30 bg-sky-950/30 p-3.5 sm:p-4 text-left">
                    <div className="flex items-center gap-3.5">
                      <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-black/60 shrink-0">
                        <Image
                          src={imagePreviewUrl}
                          alt="Pack preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white max-w-[220px] sm:max-w-xs truncate">
                            {selectedImage.name}
                          </span>
                          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono text-sky-300 border border-sky-500/30">
                            {(selectedImage.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Pack photo ready. Press{" "}
                          <span className="text-white font-mono font-medium">
                            Enter
                          </span>{" "}
                          or click arrow to verify.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleClearImage}
                      className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  /* Empty Dropzone State with Live Camera & File Triggers */
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        type="button"
                        onClick={() => setIsLiveCameraOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-950/40 px-4 py-2 text-xs sm:text-sm font-medium text-white transition-all hover:bg-sky-900/50 hover:border-sky-400 active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Camera className="h-4 w-4 text-sky-400" />
                        <span>Open Live Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs sm:text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Paperclip className="h-4 w-4 text-emerald-400" />
                        <span>Attach Pack Photo</span>
                      </button>
                    </div>

                    <p className="text-xs text-zinc-400 font-normal">
                      Drag and drop carton or blister packaging photo here, or
                      use demo presets below
                    </p>
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
                  handleImageSelect(e.target.files[0]);
                }
              }}
            />

            {/* Bottom Toolbar inside the box (Kraft screenshot layout) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 sm:px-5">
              {/* Left Action Buttons & Preset Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Live Camera Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsLiveCameraOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    isLiveCameraOpen
                      ? "border-sky-400 bg-sky-950/60 text-sky-200"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                  title="Toggle Live Web Camera"
                >
                  <Camera className="h-3.5 w-3.5 text-sky-400" />
                  <span className="hidden sm:inline">
                    {isLiveCameraOpen ? "Close Camera" : "Live Camera"}
                  </span>
                </button>

                {/* Quick Attach action */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  title="Attach file from device"
                >
                  <Paperclip className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Attach</span>
                </button>

                {/* Quick Presets for Demo */}
                <button
                  type="button"
                  onClick={() => triggerPreset("augmentin_clone")}
                  className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/40 hover:border-red-500/40 cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span>Augmentin Clone</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerPreset("coartem_genuine")}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40 hover:border-emerald-500/40 cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Coartem Genuine</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerPreset("amatem_amber")}
                  className="hidden md:flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-900/40 hover:border-amber-500/40 cursor-pointer"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Chalky Batch</span>
                </button>
              </div>

              {/* Right: Language switch + Circular Submit Arrow */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Language switcher pill */}
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-0.5 text-xs text-zinc-400">
                  <Globe2 className="h-3 w-3 ml-1.5 text-zinc-400 hidden sm:inline" />
                  {(["en", "yo", "pcm"] as LanguageKey[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setActiveLang(lang)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                        activeLang === lang
                          ? "bg-white/20 text-white font-semibold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Circular Enter/Submit Button */}
                <Magnet padding={30} magnetStrength={3}>
                  <button
                    type="button"
                    onClick={handleImageSubmit}
                    disabled={isAnalyzing}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Verify pack"
                  >
                    {isAnalyzing ? (
                      <span className="h-4 w-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                </Magnet>
              </div>
            </div>

            {/* Thinking / Analyzing Minimalistic Status Bar */}
            {isAnalyzing && (
              <div className="border-t border-sky-500/20 bg-sky-950/30 px-5 py-3 rounded-b-3xl flex items-center justify-between text-xs text-sky-300">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
                  </span>
                  <DecryptedText
                    text={steps[analysisStep]}
                    speed={25}
                    className="font-mono text-xs text-sky-200"
                  />
                </div>
                <span className="font-mono text-[11px] text-sky-400/80">
                  Step {analysisStep + 1}/4
                </span>
              </div>
            )}
          </div>
        </div>

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
