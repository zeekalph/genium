"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Paperclip,
  Camera,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  X,
  FileImage,
  Globe2,
} from "lucide-react";
import BlurText from "./reactbits/BlurText";
import DecryptedText from "./reactbits/DecryptedText";
import Magnet from "./reactbits/Magnet";

type LanguageKey = "en" | "yo" | "ha" | "ig" | "pcm";

interface ScanResult {
  scan_id: string;
  pack_name: string;
  verdict: "green" | "amber" | "red";
  confidence: number;
  extracted: {
    reg_no: string;
    product_name: string;
    manufacturer: string;
    batch_no: string;
    expiry: string;
  };
  checks: {
    reg_exists: boolean;
    reg_matches_prod: boolean;
    registered_as?: string;
    dates_valid: boolean;
    carton_vs_blister: boolean | null;
    batch_reports_count: number;
  };
  explanations: Record<LanguageKey, string>;
  next_step: string;
  batch_risk: {
    batch_no: string;
    score: number;
    level: "low" | "medium" | "high";
  };
}

// Curated demo packs from docs/LOGS.md and docs/PLAN.md
const DEMO_PRESETS: Record<string, ScanResult> = {
  augmentin_clone: {
    scan_id: "sc_aug_fake",
    pack_name: "Augmentin 625mg (Cloned Reg No)",
    verdict: "red",
    confidence: 0.97,
    extracted: {
      reg_no: "A4-100137",
      product_name: "Augmentin 625mg",
      manufacturer: "GlaxoSmithKline (Purported)",
      batch_no: "B24091",
      expiry: "2027-08",
    },
    checks: {
      reg_exists: true,
      reg_matches_prod: false,
      registered_as: "Emzor Paracetamol 500mg (Emzor Pharma)",
      dates_valid: true,
      carton_vs_blister: null,
      batch_reports_count: 0,
    },
    explanations: {
      en: "Registration number A4-100137 is registered in the NAFDAC Greenbook, but belongs to Emzor Paracetamol 500mg, NOT Augmentin. This is a stolen registration on a counterfeit pack.",
      yo: "Nọmba iforukọsilẹ A4-100137 wa ninu NAFDAC Greenbook, ṣugbọn ti Emzor Paracetamol ni, kii ṣe ti Augmentin. Wọn ji nọmba naa lẹ mọ oogun ayederu yi.",
      ha: "Lambar rijista A4-100137 tana cikin kundin NAFDAC, amma ta Emzor Paracetamol ce, ba Augmentin ba. An sace lambar an manna a jikin maganin jabu.",
      ig: "Nọmba ndebanye aha A4-100137 dị na NAFDAC Greenbook, mana ọ bụ nke Emzor Paracetamol, ọ bụghị Augmentin. Emere nnomi nọmba a na ọgwụ adịgboroja.",
      pcm: "Dis NAFDAC number A4-100137 dey inside Greenbook, but na Emzor Paracetamol get am, no be Augmentin. Person don steal paracetamol number put for fake medicine.",
    },
    next_step:
      "Do not consume. Hand over pack to nearest licensed pharmacist or report to NAFDAC.",
    batch_risk: {
      batch_no: "B24091",
      score: 0.88,
      level: "high",
    },
  },
  coartem_genuine: {
    scan_id: "sc_coa_gen",
    pack_name: "Coartem 80/480mg (Genuine)",
    verdict: "green",
    confidence: 0.98,
    extracted: {
      reg_no: "04-0348",
      product_name: "Coartem 80/480mg",
      manufacturer: "Novartis Pharma AG",
      batch_no: "X1042",
      expiry: "2027-11",
    },
    checks: {
      reg_exists: true,
      reg_matches_prod: true,
      dates_valid: true,
      carton_vs_blister: true,
      batch_reports_count: 0,
    },
    explanations: {
      en: "All deterministic checks passed. Registration number 04-0348 matches Coartem by Novartis Pharma in the Greenbook, packaging is consistent, and batch X1042 has zero crowd anomaly reports.",
      yo: "Gbogbo ayẹwo ti tọ. Nọmba 04-0348 ba Coartem ti Novartis Pharma mu ninu akọsilẹ NAFDAC, ko si iroyin aburu kankan lori ipele ogun yii.",
      ha: "Dukkan bincike ya nuna daidai ne. Lambar 04-0348 ta dace da Coartem na Novartis Pharma a kundin NAFDAC, kuma babu wani korafi a kan wannan rukunin maganin.",
      ig: "Nnyocha niile zuru oke. Nọmba 04-0348 dabara na Coartem nke Novartis Pharma n'akwụkwọ NAFDAC, ọ nweghịkwa akụkọ mkpesa ọ bụla na ya.",
      pcm: "Everything check out correctly. Di NAFDAC number 04-0348 match Coartem by Novartis for Greenbook, di carton match blister, and nobody don report dis batch.",
    },
    next_step: "No red flags found. Store below 30°C in a dry place.",
    batch_risk: {
      batch_no: "X1042",
      score: 0.05,
      level: "low",
    },
  },
  amatem_amber: {
    scan_id: "sc_amat_alert",
    pack_name: "Amatem Softgel (Batch Alert)",
    verdict: "amber",
    confidence: 0.94,
    extracted: {
      reg_no: "04-2195",
      product_name: "Amatem Softgel",
      manufacturer: "Elbe Pharma Nigeria Ltd",
      batch_no: "AM2308",
      expiry: "2026-12",
    },
    checks: {
      reg_exists: true,
      reg_matches_prod: true,
      dates_valid: true,
      carton_vs_blister: true,
      batch_reports_count: 4,
    },
    explanations: {
      en: "The NAFDAC registration is valid and matches the product, BUT batch AM2308 has 4 recent crowd reports of capsule leakage and dissolution issues in Lagos and Ogun.",
      yo: "Iforukọsilẹ NAFDAC tọ, ṣugbọn awọn eniyan 4 ti fi ẹsun le batch AM2308 ni Eko ati Ogun pe oogun inu rẹ ti n bajẹ ti o si n yo.",
      ha: "Rijistar NAFDAC tana nan da kyau, amma an sami korafe-korafe guda 4 daga jama'a kan wannan batch AM2308 cewa maganin yana fashewa a jihar Legas da Ogun.",
      ig: "Ndebanye aha NAFDAC ziri ezi, mana mmadụ anọ akọpụtala na batch AM2308 na-agbaze ma na-emebi n'ime ngwugwu ya na Lagos na Ogun.",
      pcm: "Di NAFDAC number correct, but 4 people don report say dis batch AM2308 capsules dey leak and spoil inside pack for Lagos and Ogun.",
    },
    next_step:
      "Caution advised. Check with your pharmacist before taking this specific batch.",
    batch_risk: {
      batch_no: "AM2308",
      score: 0.76,
      level: "medium",
    },
  },
};

const LANGUAGE_LABELS: Record<LanguageKey, string> = {
  en: "English",
  yo: "Yorùbá",
  ha: "Hausa",
  ig: "Igbo",
  pcm: "Pidgin",
};

const Hero = () => {
  const [inputText, setInputText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
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
    setInputText("");
    setSelectedImage(null);
    setImagePreviewUrl(null);
    startAnalysis(preset);
  };

  const handleManualSubmit = () => {
    if (!inputText.trim() && !selectedImage) return;

    // Determine realistic simulated outcome based on query
    const lower = inputText.toLowerCase();
    let targetPreset = DEMO_PRESETS.coartem_genuine;
    if (
      lower.includes("aug") ||
      lower.includes("fake") ||
      lower.includes("clone") ||
      lower.includes("a4-100137")
    ) {
      targetPreset = DEMO_PRESETS.augmentin_clone;
    } else if (
      lower.includes("chalk") ||
      lower.includes("amat") ||
      lower.includes("amber") ||
      lower.includes("am2308")
    ) {
      targetPreset = DEMO_PRESETS.amatem_amber;
    }

    startAnalysis(targetPreset);
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
    setInputText("");
    handleClearImage();
  };

  return (
    <section className="relative min-h-screen pt-28 pb-16 px-4 md:px-8 flex flex-col items-center justify-start overflow-hidden">
      {/* Subtle ambient lighting vignette (minimalistic, matching screenshot) */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full bg-gradient-to-b from-sky-500/10 via-emerald-500/5 to-transparent blur-3xl opacity-60" />

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
            of medicine safety
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-sm sm:text-base text-zinc-400 font-normal">
          Upload packaging photos or enter a registration number to instantly
          detect cloned NAFDAC numbers and crowd-flagged batches.
        </p>

        {/* Big Perplexity/Kraft-style Minimal Input Box */}
        <div className="mt-10 w-full max-w-3xl">
          <div
            className={`relative rounded-3xl border transition-all duration-300 ${
              isAnalyzing
                ? "border-sky-500/50 shadow-[0_0_40px_rgba(14,165,233,0.15)] bg-zinc-950/95"
                : "border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-2xl hover:border-white/20"
            }`}
          >
            {/* Top Area: Text input + Drag & Drop preview */}
            <div className="p-4 sm:p-5 text-left">
              {/* Attached Image Thumbnail Chip */}
              {selectedImage && (
                <div className="mb-3 inline-flex items-center gap-2.5 rounded-xl border border-sky-500/30 bg-sky-950/40 px-3 py-1.5 text-xs text-sky-200">
                  <FileImage className="h-4 w-4 text-sky-400" />
                  <span className="max-w-[200px] truncate font-mono">
                    {selectedImage.name}
                  </span>
                  <button
                    onClick={handleClearImage}
                    className="rounded-full p-0.5 hover:bg-white/10 text-zinc-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Main input textarea / prompt line */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleManualSubmit();
                  }
                }}
                disabled={isAnalyzing}
                placeholder={
                  selectedImage
                    ? "Pack photo ready. Press Enter or click arrow to verify..."
                    : "Drop pack photo (carton/blister), or enter NAFDAC reg no / batch..."
                }
                className="w-full bg-transparent text-sm sm:text-base text-white placeholder-zinc-500 outline-none focus:outline-none"
              />
            </div>

            {/* Hidden native file input */}
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
                {/* Upload Pack Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                  title="Upload Carton or Blister Photo"
                >
                  <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Attach Pack</span>
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
                    onClick={handleManualSubmit}
                    disabled={isAnalyzing}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-md transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                    title="Press Enter to Verify"
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

        {/* VERIFICATION OUTCOME HUD (Renders smoothly beneath the box) */}
        {result && (
          <div className="mt-8 w-full max-w-3xl text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div
              className={`rounded-3xl border p-6 backdrop-blur-xl shadow-2xl ${
                result.verdict === "green"
                  ? "border-emerald-500/30 bg-emerald-950/20 shadow-emerald-500/5"
                  : result.verdict === "amber"
                    ? "border-amber-500/30 bg-amber-950/20 shadow-amber-500/5"
                    : "border-red-500/30 bg-red-950/20 shadow-red-500/5"
              }`}
            >
              {/* Header Row: Verdict Status & Reset */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  {result.verdict === "green" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  ) : result.verdict === "amber" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                      <XCircle className="h-6 w-6" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">
                        {result.pack_name}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          result.verdict === "green"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : result.verdict === "amber"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-red-500/20 text-red-300 border border-red-500/40"
                        }`}
                      >
                        {result.verdict === "green"
                          ? "Verified Clear"
                          : result.verdict === "amber"
                            ? "Crowd Alert"
                            : "Registry Mismatch"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                      OCR Confidence: {(result.confidence * 100).toFixed(0)}% ·
                      Scan ID: {result.scan_id}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Verify Another</span>
                </button>
              </div>

              {/* Extracted Metadata Grid (with React Bits DecryptedText) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs border-b border-white/[0.08]">
                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-2.5">
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">
                    NAFDAC Reg No
                  </span>
                  <span className="font-mono font-semibold text-white mt-0.5 block">
                    <DecryptedText text={result.extracted.reg_no} speed={30} />
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-2.5">
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">
                    Product Name
                  </span>
                  <span className="font-semibold text-white mt-0.5 block truncate">
                    {result.extracted.product_name}
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-2.5">
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">
                    Batch Number
                  </span>
                  <span className="font-mono font-semibold text-white mt-0.5 block">
                    {result.extracted.batch_no}
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-2.5">
                  <span className="text-zinc-500 block text-[10px] uppercase font-mono">
                    Expiry Date
                  </span>
                  <span className="font-mono font-semibold text-white mt-0.5 block">
                    {result.extracted.expiry}
                  </span>
                </div>
              </div>

              {/* Red Mismatch Detail Alert if registration was stolen */}
              {result.checks.reg_matches_prod === false && (
                <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-200">
                  <span className="font-bold text-red-100 uppercase tracking-wide block mb-1">
                    Critical Registry Collision Detected
                  </span>
                  Registration{" "}
                  <code className="font-mono font-bold text-red-300">
                    {result.extracted.reg_no}
                  </code>{" "}
                  is officially assigned to:{" "}
                  <strong className="underline text-white">
                    {result.checks.registered_as}
                  </strong>
                  .
                </div>
              )}

              {/* Multilingual Plain-Language Explainer Block */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                    Plain-Language Explanation ({LANGUAGE_LABELS[activeLang]}):
                  </span>
                  {/* Language switcher pills */}
                  <div className="flex items-center gap-1">
                    {(Object.keys(LANGUAGE_LABELS) as LanguageKey[]).map(
                      (lang) => (
                        <button
                          key={lang}
                          onClick={() => setActiveLang(lang)}
                          className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                            activeLang === lang
                              ? "bg-white/20 text-white font-bold"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          {lang.toUpperCase()}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                  {result.explanations[activeLang]}
                </div>
              </div>

              {/* Recommended Next Step */}
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
                <div className="text-zinc-400">
                  <span className="font-semibold text-zinc-300">Action:</span>{" "}
                  {result.next_step}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
