"use client";

import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Activity,
  Layers,
} from "lucide-react";
import DecryptedText from "../reactbits/DecryptedText";
import {
  ScanResult,
  LanguageKey,
  LANGUAGE_LABELS,
  ExtractedField,
  VerificationCheck,
} from "./types";

interface VerificationHUDProps {
  result: ScanResult;
  activeLang: LanguageKey;
  onSelectLang: (lang: LanguageKey) => void;
  onReset: () => void;
}

const getFieldValue = (field: string | ExtractedField | undefined): string => {
  if (!field) return "—";
  if (typeof field === "string") return field;
  return field.value || "Not detected";
};

const getFieldConfidence = (
  field: string | ExtractedField | undefined
): number | null => {
  if (!field || typeof field === "string") return null;
  return typeof field.confidence === "number" && field.confidence > 0
    ? field.confidence
    : null;
};

const CHECK_LABELS: Record<string, string> = {
  reg_exists: "NAFDAC Registry",
  reg_matches_prod: "Product Identity",
  dates_valid: "Expiry Verification",
  carton_vs_blister: "Pack Cross-Check",
  batch_reports: "Crowd Intelligence",
};

export const VerificationHUD: React.FC<VerificationHUDProps> = ({
  result,
  activeLang,
  onSelectLang,
  onReset,
}) => {
  // Determine if checks is an array or object
  const isChecksArray = Array.isArray(result.checks);
  const checksList: VerificationCheck[] = isChecksArray
    ? (result.checks as VerificationCheck[])
    : [];

  const legacyChecks = !isChecksArray ? (result.checks as any) : null;
  const isMismatch = isChecksArray
    ? checksList.some((c) => c.id === "reg_matches_prod" && c.pass === false)
    : legacyChecks?.reg_matches_prod === false;

  const mismatchCheck = isChecksArray
    ? checksList.find((c) => c.id === "reg_matches_prod")
    : null;

  const regNoStr = getFieldValue(result.extracted.reg_no);
  const prodNameStr = getFieldValue(result.extracted.product_name);
  const batchNoStr = getFieldValue(result.extracted.batch_no);
  const expiryStr = getFieldValue(result.extracted.expiry);

  const regConf = getFieldConfidence(result.extracted.reg_no);
  const prodConf = getFieldConfidence(result.extracted.product_name);
  const batchConf = getFieldConfidence(result.extracted.batch_no);
  const expiryConf = getFieldConfidence(result.extracted.expiry);

  const explanationText =
    (result.explanations && result.explanations[activeLang]) ||
    result.explanation ||
    result.explanations?.en ||
    "Packaging verification analysis complete.";

  return (
    <div className="mt-8 w-full max-w-3xl text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className={`rounded-3xl border p-6 backdrop-blur-xl shadow-2xl transition-all ${
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
                Model Confidence: {(result.confidence * 100).toFixed(0)}% · Scan ID:{" "}
                {result.scan_id}
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

        {/* Extracted Metadata Grid (with React Bits DecryptedText & confidence tags) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 text-xs border-b border-white/[0.08]">
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">
                NAFDAC Reg No
              </span>
              {regConf && (
                <span className="text-[10px] font-mono text-zinc-400">
                  {(regConf * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <span className="font-mono font-semibold text-white mt-1 block truncate">
              <DecryptedText text={regNoStr} speed={30} />
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">
                Product Name
              </span>
              {prodConf && (
                <span className="text-[10px] font-mono text-zinc-400">
                  {(prodConf * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <span className="font-semibold text-white mt-1 block truncate" title={prodNameStr}>
              {prodNameStr}
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">
                Batch Number
              </span>
              {batchConf && (
                <span className="text-[10px] font-mono text-zinc-400">
                  {(batchConf * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <span className="font-mono font-semibold text-white mt-1 block truncate">
              {batchNoStr}
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 text-[10px] uppercase font-mono">
                Expiry Date
              </span>
              {expiryConf && (
                <span className="text-[10px] font-mono text-zinc-400">
                  {(expiryConf * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <span className="font-mono font-semibold text-white mt-1 block truncate">
              {expiryStr}
            </span>
          </div>
        </div>

        {/* Deterministic Verification Checks Breakdown */}
        {isChecksArray && checksList.length > 0 && (
          <div className="py-4 border-b border-white/[0.08]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2.5 flex items-center gap-1.5">
              <Layers className="h-3 w-3 text-sky-400" />
              Deterministic Verification Checks
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {checksList.map((check) => {
                const label = CHECK_LABELS[check.id] || check.id;
                return (
                  <div
                    key={check.id}
                    className={`flex items-start gap-2 rounded-xl p-2.5 text-xs border ${
                      check.pass === true
                        ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-200"
                        : check.pass === false
                        ? "border-red-500/20 bg-red-950/20 text-red-200"
                        : "border-amber-500/20 bg-amber-950/20 text-amber-200"
                    }`}
                  >
                    {check.pass === true ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : check.pass === false ? (
                      <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold block text-[11px] text-white">
                        {label}
                      </span>
                      <p className="text-[11px] text-zinc-300 leading-tight mt-0.5">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Red Mismatch Detail Alert if registration was stolen */}
        {isMismatch && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-200">
            <span className="font-bold text-red-100 uppercase tracking-wide block mb-1">
              Critical Registry Collision Detected
            </span>
            {mismatchCheck ? (
              <p className="leading-relaxed">{mismatchCheck.detail}</p>
            ) : (
              <p>
                Registration <code className="font-mono font-bold text-red-300">{regNoStr}</code> is
                officially assigned to: <strong className="underline text-white">{legacyChecks?.registered_as || "another product"}</strong>.
              </p>
            )}
          </div>
        )}

        {/* AI Agent Explainer Block */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              AI Agent Explanation:
            </span>
            {result.explanations && (
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
            )}
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4 text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
            {explanationText}
          </div>
        </div>

        {/* Recommended Next Step & Batch Risk */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-zinc-400">
            <span className="font-semibold text-zinc-300">Action:</span> {result.next_step}
          </div>
          {typeof result.batch_risk?.reports === "number" && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
              <Activity className="h-3 w-3 text-sky-400" />
              <span>
                Batch {result.batch_risk.batch_no || "N/A"}: {result.batch_risk.reports} reports
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationHUD;

