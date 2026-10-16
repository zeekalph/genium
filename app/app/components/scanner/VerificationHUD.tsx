"use client";

import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import DecryptedText from "../reactbits/DecryptedText";
import { ScanResult, LanguageKey, LANGUAGE_LABELS } from "./types";

interface VerificationHUDProps {
  result: ScanResult;
  activeLang: LanguageKey;
  onSelectLang: (lang: LanguageKey) => void;
  onReset: () => void;
}

export const VerificationHUD: React.FC<VerificationHUDProps> = ({
  result,
  activeLang,
  onSelectLang,
  onReset,
}) => {
  return (
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
                OCR Confidence: {(result.confidence * 100).toFixed(0)}% · Scan ID: {result.scan_id}
              </p>
            </div>
          </div>

          <button
            onClick={onReset}
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
            Registration <code className="font-mono font-bold text-red-300">{result.extracted.reg_no}</code> is
            officially assigned to: <strong className="underline text-white">{result.checks.registered_as}</strong>.
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
              {(Object.keys(LANGUAGE_LABELS) as LanguageKey[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onSelectLang(lang)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    activeLang === lang
                      ? "bg-white/20 text-white font-bold"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
            {result.explanations[activeLang]}
          </div>
        </div>

        {/* Recommended Next Step */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
          <div className="text-zinc-400">
            <span className="font-semibold text-zinc-300">Action:</span> {result.next_step}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationHUD;
