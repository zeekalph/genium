"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Magnet from "./reactbits/Magnet";
import ShinyText from "./reactbits/ShinyText";
import {
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

  // Keyboard shortcut (Escape to close) and body scroll lock for mobile viewports
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDemoModalOpen) {
        setIsDemoModalOpen(false);
      }
    };

    if (isDemoModalOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDemoModalOpen]);

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
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.08] bg-black/60 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 md:px-10">
          {/* Logo (no wordmark) with React Bits Magnet */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Magnet padding={20} magnetStrength={2}>
              <a
                href="/"
                aria-label="Genium Home"
                className="relative flex items-center justify-center select-none group touch-manipulation"
              >
                <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-sky-500/30 bg-black shadow-[0_0_14px_rgba(14,165,233,0.3)] transition-all group-hover:border-sky-400 group-hover:scale-105 group-hover:shadow-[0_0_22px_rgba(14,165,233,0.5)]">
                  <Image
                    src="/logo.png"
                    alt="Genium Logo"
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                    priority
                  />{" "}
                </div>
                <span
                  className="text-base sm:text-lg md:text-[1.25rem] font-bold tracking-tight text-white shrink-0"
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
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 sm:inline-flex shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                Judge Pass Active
              </span>
            )}
          </div>

          {/* Actions: GitHub Repo + Sign in / Judge Demo Pass with Magnet */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick GitHub repo link */}
            <a
              href="https://github.com/zeekalph/genium"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Repository"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95 touch-manipulation shrink-0"
            >
              <svg
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </a>

            {isJudgeActive ? (
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium text-emerald-300 transition-all hover:bg-emerald-900/60 hover:border-emerald-400 active:scale-95 cursor-pointer touch-manipulation shrink-0"
                aria-label="Judge Pass Settings"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="hidden sm:inline">Signed In (Judge)</span>
                <span className="sm:hidden">Signed In</span>
              </button>
            ) : (
              <Magnet padding={15} magnetStrength={2}>
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="relative cursor-pointer flex items-center gap-1.5 sm:gap-2 overflow-hidden rounded-lg bg-sky-500 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-[0_0_16px_rgba(14,165,233,0.3)] transition-all hover:bg-sky-400 active:scale-[0.97] touch-manipulation shrink-0"
                >
                  <KeyRound className="h-3.5 w-3.5 shrink-0" />
                  <span>Sign in</span>
                </button>
              </Magnet>
            )}
          </div>
        </div>
      </nav>

      {/* Judge Demo Pass Modal */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-md my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-6 shadow-2xl shadow-sky-500/10">
            {/* Close button with comfortable mobile touch target */}
            <button
              onClick={() => setIsDemoModalOpen(false)}
              aria-label="Close modal"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors active:scale-95 touch-manipulation"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pr-8">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-950/50 text-sky-400">
                <KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-white leading-tight">
                  Judge & Evaluator Access
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                  Test Genium with full permissions without signup
                </p>
              </div>
            </div>

            {/* Status box */}
            {isJudgeActive ? (
              <div className="mt-4 sm:mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 sm:p-4">
                <div className="flex items-center gap-2 text-emerald-400 text-xs sm:text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Judge Demo Pass Active</span>
                </div>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                  Full evaluation bypass enabled. You can test all OCR scans,
                  Greenbook checks, and batch anomaly reports.
                </p>
                <button
                  onClick={handleDeactivateJudge}
                  className="mt-3 text-xs text-zinc-400 hover:text-red-400 underline transition-colors touch-manipulation"
                >
                  Deactivate Judge Mode
                </button>
              </div>
            ) : (
              <div className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
                <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Configured Demo Code:</span>
                    <span className="font-mono font-bold text-sky-400 text-xs sm:text-sm">
                      {DEMO_CODE_DEFAULT}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] sm:text-[11px] text-zinc-400">
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
                      className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-[16px] sm:text-sm text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                    <button
                      onClick={() => handleApplyDemoCode()}
                      className="rounded-lg bg-white/10 px-3.5 sm:px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 active:scale-95 transition-all touch-manipulation shrink-0"
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
                  <span className="relative bg-zinc-950 px-2 text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500">
                    Fast Pass for Judges
                  </span>
                </div>

                <button
                  onClick={() => handleApplyDemoCode(DEMO_CODE_DEFAULT)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:opacity-90 active:scale-[0.98] touch-manipulation"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>1-Click Unlock with Demo Code</span>
                </button>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-500">
              <span>Genium NAFDAC Verification</span>
              <a
                href="https://github.com/zeekalph/genium"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-zinc-300 transition-colors touch-manipulation"
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
