"use client";

import React, { useState, useEffect } from "react";
import ShinyText from "./reactbits/ShinyText";
import Magnet from "./reactbits/Magnet";
import {
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const DEMO_CODE_DEFAULT =
  process.env.NEXT_PUBLIC_DEMO_CODE || "GENIUM-JUDGE-2026";

const Navbar = () => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [isJudgeActive, setIsJudgeActive] = useState(false);
  const [codeError, setCodeError] = useState("");

  // Check if judge pass was previously enabled in session
  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("genium_judge_mode")
        : null;
    if (saved === "true") {
      setIsJudgeActive(true);
    }
  }, []);

  const handleApplyDemoCode = (codeToApply?: string) => {
    const code = (codeToApply ?? inputCode).trim().toUpperCase();
    if (
      code === DEMO_CODE_DEFAULT.toUpperCase() ||
      code === "GENIUM-JUDGE-2026"
    ) {
      setIsJudgeActive(true);
      setCodeError("");
      localStorage.setItem("genium_judge_mode", "true");
      setIsDemoModalOpen(false);
    } else {
      setCodeError("Invalid demo code. Click 'Use Judge Demo Code' below.");
    }
  };

  const handleDeactivateJudge = () => {
    setIsJudgeActive(false);
    localStorage.removeItem("genium_judge_mode");
  };

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.08] bg-black/50 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 md:px-10">
          {/* Logo + wordmark with React Bits Magnet & ShinyText */}
          <div className="flex items-center gap-3">
            <Magnet padding={50} magnetStrength={3}>
              <a
                href="/"
                className="flex items-center gap-2.5 select-none group"
              >
                {/* <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-950/40 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all group-hover:border-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400" />
                </div> */}
                <span
                  className="text-[1.25rem] font-bold tracking-[-0.03em] text-white"
                  style={{ fontFamily: "var(--font-bricolage), sans-serif" }}
                >
                  <ShinyText
                    text="Genium"
                    speed={3.5}
                    className="font-semibold text-white"
                  />
                </span>
              </a>
            </Magnet>

            {isJudgeActive && (
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 lg:inline-flex shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Judge Pass Active
              </span>
            )}
          </div>

          {/* Nav links with React Bits Magnet */}
          <div className="hidden items-center gap-8 md:flex">
            {/* <Magnet padding={40} magnetStrength={4}>
              <a
                href="#features"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Features
              </a>
            </Magnet>
            <Magnet padding={40} magnetStrength={4}>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                How it works
              </a>
            </Magnet>
            <Magnet padding={40} magnetStrength={4}>
              <a
                href="#faqs"
                className="text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                FAQ
              </a>
            </Magnet> */}
          </div>

          {/* Actions: Sign in / Judge Demo Pass with Magnet */}
          <div className="flex items-center justify-end gap-3">
            {isJudgeActive ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-2 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-900/60 hover:border-emerald-400"
                >
                  <span>Signed In</span>
                </button>
              </div>
            ) : (
              <Magnet padding={40} magnetStrength={3}>
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="relative cursor-pointer flex items-center gap-2 overflow-hidden rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all hover:bg-sky-400 active:scale-[0.97]"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Sign in</span>
                </button>
              </Magnet>
            )}
          </div>
        </div>
      </nav>

      {/* Judge Demo Pass Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-sky-500/10">
            {/* Close button */}
            <button
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-950/50 text-sky-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Judge & Evaluator Access
                </h3>
                <p className="text-xs text-zinc-400">
                  Test Genium with full permissions without signup
                </p>
              </div>
            </div>

            {/* Status box */}
            {isJudgeActive ? (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Judge Demo Pass Active</span>
                </div>
                <p className="mt-1 text-xs text-zinc-300">
                  Full evaluation bypass enabled. You can test all OCR scans,
                  Greenbook checks, and batch anomaly reports.
                </p>
                <button
                  onClick={handleDeactivateJudge}
                  className="mt-3 text-xs text-zinc-400 hover:text-red-400 underline transition-colors"
                >
                  Deactivate Judge Mode
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Configured Demo Code:</span>
                    <span className="font-mono font-bold text-sky-400">
                      {DEMO_CODE_DEFAULT}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    Defined in <code className="text-zinc-300">.env.local</code>{" "}
                    as{" "}
                    <code className="text-sky-300">NEXT_PUBLIC_DEMO_CODE</code>
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300">
                    Enter Demo Code
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. GENIUM-JUDGE-2026"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                    <button
                      onClick={() => handleApplyDemoCode()}
                      className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all"
                    >
                      Verify
                    </button>
                  </div>
                  {codeError && (
                    <p className="mt-1.5 text-xs text-red-400">{codeError}</p>
                  )}
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.08]" />
                  </div>
                  <span className="relative bg-zinc-950 px-2 text-[11px] uppercase tracking-wider text-zinc-500">
                    Fast Pass for Judges
                  </span>
                </div>

                <button
                  onClick={() => handleApplyDemoCode(DEMO_CODE_DEFAULT)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>1-Click Unlock with Demo Code</span>
                </button>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500">
              <span>Genium NAFDAC Verification</span>
              <a
                href="https://github.com/zeekalph/genium"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-zinc-300"
              >
                GitHub Repo <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
