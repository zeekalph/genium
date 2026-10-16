"use client";

import React, { useRef, useState, useEffect } from "react";
import { Camera, X, RefreshCw, AlertCircle, Sparkles } from "lucide-react";

interface LiveCameraBoxProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const LiveCameraBox: React.FC<LiveCameraBoxProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isStarting, setIsStarting] = useState(true);

  const startCamera = async () => {
    setIsStarting(true);
    setErrorMessage("");

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Web camera is not supported in this browser environment.");
      }

      // Try environment/back camera first, fallback to generic video
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasPermission(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setHasPermission(false);
      setErrorMessage(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Webcam not found or currently in use by another application."
      );
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `pack_scan_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        // Stop stream before delivering
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        onCapture(file);
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-sky-500/30 bg-black/90 p-4 text-center shadow-2xl">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Header inside camera box */}
      <div className="flex items-center justify-between pb-3 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-white">Live Web Optical Scanner</span>
          <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-mono text-sky-300 border border-sky-500/30">
            Gemma 4 Vision Ready
          </span>
        </div>

        <button
          onClick={onClose}
          className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          title="Close Camera"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Video Viewport / Reticle */}
      <div className="relative mx-auto aspect-video max-h-[320px] w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950 flex items-center justify-center">
        {hasPermission === false ? (
          <div className="p-6 text-center max-w-sm">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-400 mb-2" />
            <p className="text-xs text-zinc-300 mb-3">{errorMessage}</p>
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Camera</span>
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Packaging Target Reticle Overlay */}
            <div className="pointer-events-none absolute inset-6 sm:inset-10 rounded-lg border-2 border-dashed border-sky-400/50 flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <span className="h-3 w-3 border-t-2 border-l-2 border-sky-400" />
                <span className="h-3 w-3 border-t-2 border-r-2 border-sky-400" />
              </div>
              <p className="text-[11px] font-mono tracking-wide text-sky-200/90 text-center bg-black/40 py-0.5 rounded backdrop-blur-sm self-center px-2">
                Align NAFDAC label inside frame
              </p>
              <div className="flex justify-between">
                <span className="h-3 w-3 border-b-2 border-l-2 border-sky-400" />
                <span className="h-3 w-3 border-b-2 border-r-2 border-sky-400" />
              </div>
            </div>

            {/* Subtle animated horizontal laser scan line */}
            <div className="pointer-events-none absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_8px_rgba(56,189,248,0.8)] animate-pulse" />
          </>
        )}
      </div>

      {/* Shutter Action Bar */}
      {hasPermission && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleCapture}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="h-4 w-4" />
            <span>Snap & Inspect Pack</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default LiveCameraBox;
