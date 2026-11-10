"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { verifyImageWithProgress, VerificationResult } from "@/lib/api";
import {
  compressReceiptImage,
  computeVideoFrameCrop,
  cropAndCompressVideoFrame,
} from "@/lib/imageCompressor";
import { haptic } from "@/lib/telegram";

interface LiveReceiptScannerProps {
  onClose: () => void;
  onVerified?: (result: VerificationResult) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type ScannerStep = "camera" | "preview" | "verifying";
type FrameShape = "screenshot" | "tall" | "wide";
type QualityState = "idle" | "dark" | "moving" | "blurry" | "sharp";
type VerifyStage = "reading" | "checking_bank" | "done";
type CameraFallbackReason = "denied" | "unavailable" | "unsupported" | null;

interface ExtendedTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: { min: number; max: number; step?: number };
  focusMode?: string[];
  pointsOfInterest?: unknown;
}

interface ExtendedConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
  zoom?: number;
  focusMode?: string;
  pointsOfInterest?: Array<{ x: number; y: number }>;
}

interface BoxDims {
  width: number;
  height: number;
}

const STORAGE_SHAPE_KEY = "cf_scanner_frame_shape";
const STORAGE_AUTO_KEY = "cf_scanner_auto_capture";
const DEFAULT_TIP = "Make sure the receipt is flat, well lit and all text is clear.";

function parseSavedShape(): FrameShape {
  if (typeof window === "undefined") return "screenshot";
  const saved = localStorage.getItem(STORAGE_SHAPE_KEY);
  if (saved === "tall" || saved === "wide" || saved === "screenshot") return saved;
  return "screenshot";
}

function getTargetAspect(shape: FrameShape): number {
  if (shape === "tall") return 1 / 2.25; // ~1:2.25 narrow tall paper receipt
  if (shape === "wide") return 4 / 3;    // 4:3 small slip / landscape document
  return 9 / 19;                         // ~9:19 modern phone screenshot (default)
}

function fitAspectBox(maxW: number, maxH: number, ratio: number): BoxDims {
  const safeW = Math.max(120, maxW);
  const safeH = Math.max(120, maxH);
  if (safeW / safeH > ratio) {
    const height = Math.floor(safeH);
    const width = Math.max(90, Math.floor(height * ratio));
    return { width, height };
  }
  const width = Math.floor(safeW);
  const height = Math.max(90, Math.floor(width / ratio));
  return { width, height };
}

export default function LiveReceiptScanner({
  onClose,
  onVerified,
  showToast,
}: LiveReceiptScannerProps) {
  const [step, setStep] = useState<ScannerStep>("camera");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
<<<<<<< HEAD
  const [provider, setProvider] = useState<string>(initialProvider);
=======
  const [cameraError, setCameraError] = useState<string | null>(null);
>>>>>>> e5c75ea (update the live receipt)

  const [frameShape, setFrameShape] = useState<FrameShape>(parseSavedShape);
  const [autoCapture, setAutoCapture] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_AUTO_KEY) === "1";
  });

  // Dynamically computed layout dimensions so frame fills available space with 0 overlap
  const [stageBounds, setStageBounds] = useState<{ top: number; bottom: number }>({ top: 64, bottom: 132 });
  const [frameDims, setFrameDims] = useState<BoxDims>({ width: 310, height: 640 });
  const [previewBounds, setPreviewBounds] = useState<{ top: number; bottom: number }>({ top: 64, bottom: 90 });
  const [previewDims, setPreviewDims] = useState<BoxDims>({ width: 320, height: 660 });

  // Camera capabilities & live status
  const [isStarting, setIsStarting] = useState<boolean>(true);
  const [cameraReady, setCameraReady] = useState<boolean>(false);
  const [fallbackReason, setFallbackReason] = useState<CameraFallbackReason>(null);
  const [supportsTorch, setSupportsTorch] = useState<boolean>(false);
  const [flashOn, setFlashOn] = useState<boolean>(false);

  const [supportsZoom, setSupportsZoom] = useState<boolean>(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number }>({
    min: 1,
    max: 3,
    step: 0.1,
  });
  const [zoomVal, setZoomVal] = useState<number>(1);

  // Live quality feedback & visual cues
  const [qualityState, setQualityState] = useState<QualityState>("idle");
  const [qualityText, setQualityText] = useState<string>(DEFAULT_TIP);
  const [autoProgress, setAutoProgress] = useState<number>(0);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [pulseShutterHint, setPulseShutterHint] = useState<boolean>(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; key: number } | null>(null);

  // Captured preview & verification progress
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verifyStage, setVerifyStage] = useState<VerifyStage>("reading");

  // Layout & media refs
  const modalRef = useRef<HTMLDivElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const bottomHudRef = useRef<HTMLDivElement | null>(null);
  const previewTopRef = useRef<HTMLDivElement | null>(null);
  const previewDockRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const capsRef = useRef<ExtendedTrackCapabilities>({});
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const attemptIdRef = useRef<number>(0);
  const previewUrlRef = useRef<string | null>(null);
  const stepRef = useRef<ScannerStep>("camera");
  const shapeRef = useRef<FrameShape>(frameShape);
  const cameraReadyRef = useRef<boolean>(false);
  const isCapturingRef = useRef<boolean>(false);
  const isVerifyingRef = useRef<boolean>(false);
  const pickingFileRef = useRef<boolean>(false);
  const processingFileRef = useRef<boolean>(false);
  const fallbackReasonRef = useRef<CameraFallbackReason>(null);

  const flashOnRef = useRef<boolean>(false);
  const flashBeforePreviewRef = useRef<boolean>(false);
  const autoCaptureRef = useRef<boolean>(autoCapture);
  const autoSharpSinceRef = useRef<number>(0);
  const autoCooldownUntilRef = useRef<number>(0);
  const prevLumaRef = useRef<Uint8Array | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const focusRestoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gesture state refs
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartZoomRef = useRef<number>(1);
  const currentZoomRef = useRef<number>(1);
  const touchMovedRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTouchTapRef = useRef<number>(0);
  const zoomRafRef = useRef<boolean>(false);
  const pendingZoomRef = useRef<number>(1);

  useEffect(() => { previewUrlRef.current = previewUrl; }, [previewUrl]);
  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { shapeRef.current = frameShape; }, [frameShape]);
  useEffect(() => { cameraReadyRef.current = cameraReady; }, [cameraReady]);
  useEffect(() => { fallbackReasonRef.current = fallbackReason; }, [fallbackReason]);
  useEffect(() => { flashOnRef.current = flashOn; }, [flashOn]);
  useEffect(() => { autoCaptureRef.current = autoCapture; }, [autoCapture]);

  // ── Compute Real Available Screen Space for Frame & Preview ────────────────
  const recomputeDimensions = useCallback(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;
    const modalRect = modalEl.getBoundingClientRect();
    if (modalRect.width <= 0 || modalRect.height <= 0) return;

    const ratio = getTargetAspect(shapeRef.current);
    const maxTargetW = Math.min(modalRect.width * 0.9, 560);

    // Camera live stage bounds
    if (topBarRef.current && bottomHudRef.current) {
      const topRect = topBarRef.current.getBoundingClientRect();
      const hudRect = bottomHudRef.current.getBoundingClientRect();
      const topOffset = Math.max(0, Math.round(topRect.bottom - modalRect.top));
      const bottomOffset = Math.max(0, Math.round(modalRect.bottom - hudRect.top));
      const availH = Math.max(120, hudRect.top - topRect.bottom - 30); // 24px top hint margin + 6px bottom buffer
      const availW = Math.max(140, maxTargetW);

      setStageBounds({ top: topOffset, bottom: bottomOffset });
      setFrameDims(fitAspectBox(availW, availH, ratio));
    }

    // Preview stage bounds (uses real preview bars so whole photo is never cut)
    if (previewTopRef.current && previewDockRef.current) {
      const pTopRect = previewTopRef.current.getBoundingClientRect();
      const pDockRect = previewDockRef.current.getBoundingClientRect();
      const pTopOff = Math.max(0, Math.round(pTopRect.bottom - modalRect.top));
      const pBotOff = Math.max(0, Math.round(modalRect.bottom - pDockRect.top));
      const pAvailH = Math.max(120, pDockRect.top - pTopRect.bottom - 14);
      const pAvailW = Math.max(140, Math.min(modalRect.width * 0.92, 580));

      setPreviewBounds({ top: pTopOff, bottom: pBotOff });
      setPreviewDims(fitAspectBox(pAvailW, pAvailH, ratio));
    }
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => recomputeDimensions());
    const handleResize = () => recomputeDimensions();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && modalRef.current) {
      observer = new ResizeObserver(handleResize);
      observer.observe(modalRef.current);
      if (topBarRef.current) observer.observe(topBarRef.current);
      if (bottomHudRef.current) observer.observe(bottomHudRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      observer?.disconnect();
    };
  }, [frameShape, step, supportsZoom, fallbackReason, recomputeDimensions]);

  const clearCapturedPhoto = useCallback(() => {
    if (previewUrlRef.current) {
      try { URL.revokeObjectURL(previewUrlRef.current); } catch {}
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setCapturedFile(null);
    if (nativeCameraInputRef.current) nativeCameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }, []);

  const stopCamera = useCallback(() => {
    attemptIdRef.current += 1;
    cameraReadyRef.current = false;
    setCameraReady(false);
    setIsStarting(false);

    if (focusRestoreTimerRef.current) {
      clearTimeout(focusRestoreTimerRef.current);
      focusRestoreTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          if (flashOnRef.current && typeof track.applyConstraints === "function") {
            const offConstraint: ExtendedConstraintSet = { torch: false };
            track.applyConstraints({ advanced: [offConstraint] }).catch(() => {});
          }
        } catch {}
        try { track.stop(); } catch {}
      });
      streamRef.current = null;
    }

    trackRef.current = null;
    capsRef.current = {};
    setSupportsTorch(false);
    setFlashOn(false);
    setSupportsZoom(false);
    setAutoProgress(0);
    autoSharpSinceRef.current = 0;
    prevLumaRef.current = null;

    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      videoRef.current.srcObject = null;
    }
  }, []);

  const setTorch = useCallback(async (enabled: boolean) => {
    const track = trackRef.current;
    if (!track || typeof track.applyConstraints !== "function" || !capsRef.current.torch) return;
    try {
      const constraint: ExtendedConstraintSet = { torch: enabled };
      await track.applyConstraints({ advanced: [constraint] });
      setFlashOn(enabled);
    } catch {
      setFlashOn(false);
    }
  }, []);

  const applyZoom = useCallback(
    (target: number) => {
      if (!supportsZoom || !trackRef.current || typeof trackRef.current.applyConstraints !== "function") {
        return;
      }
      const clamped = Math.max(zoomRange.min, Math.min(zoomRange.max, target));
      currentZoomRef.current = clamped;
      setZoomVal(clamped);
      pendingZoomRef.current = clamped;

      if (zoomRafRef.current) return;
      zoomRafRef.current = true;
      requestAnimationFrame(() => {
        zoomRafRef.current = false;
        const track = trackRef.current;
        if (!track) return;
        const constraint: ExtendedConstraintSet = { zoom: pendingZoomRef.current };
        track.applyConstraints({ advanced: [constraint] }).catch(() => {});
      });
    },
    [supportsZoom, zoomRange.max, zoomRange.min]
  );

  const waitForVideoReady = useCallback((video: HTMLVideoElement, attemptId: number): Promise<boolean> => {
    if (video.videoWidth > 0 && video.readyState >= 2) return Promise.resolve(true);

    return new Promise((resolve) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        clearTimeout(timeout);
        video.removeEventListener("loadedmetadata", check);
        video.removeEventListener("canplay", check);
        video.removeEventListener("playing", check);
        resolve(ok);
      };
      const check = () => {
        if (attemptId !== attemptIdRef.current) return done(false);
        if (video.videoWidth > 0 && video.readyState >= 2) done(true);
      };
      video.addEventListener("loadedmetadata", check);
      video.addEventListener("canplay", check);
      video.addEventListener("playing", check);
      const poll = setInterval(check, 60);
      const timeout = setTimeout(() => done(video.videoWidth > 0), 4000);
    });
  }, []);

  const acquireCameraStream = useCallback(async (mode: "environment" | "user"): Promise<MediaStream> => {
    const candidates: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: mode }, width: { ideal: 2560 }, height: { ideal: 1440 } }, audio: false },
      { video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: { facingMode: { ideal: mode } }, audio: false },
    ];
    if (mode === "environment") {
      candidates.push({ video: true, audio: false });
    }

    let lastErr: unknown = null;
    for (const c of candidates) {
      try {
        return await navigator.mediaDevices.getUserMedia(c);
      } catch (err: unknown) {
        lastErr = err;
        const name = (err as Error)?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
          throw err;
        }
      }
    }
    throw lastErr || new Error("Camera unavailable");
  }, []);

  const startCamera = useCallback(
    async (mode: "environment" | "user", isCancelled?: () => boolean) => {
      stopCamera();
<<<<<<< HEAD
      const attemptId = ++attemptIdRef.current;

      setFallbackReason(null);
      setIsStarting(true);
      setCameraReady(false);
      setQualityState("idle");
      setQualityText(DEFAULT_TIP);
=======
      await Promise.resolve();
      if (isCancelled?.()) return;
      setCameraError(null);
>>>>>>> e5c75ea (update the live receipt)

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setIsStarting(false);
        setFallbackReason("unsupported");
        return;
      }

      // Brief hardware settle delay prevents iOS NotReadableError when switching cameras
      await new Promise((r) => setTimeout(r, 50));
      if (attemptId !== attemptIdRef.current) return;

      try {
        const stream = await acquireCameraStream(mode);
        if (attemptId !== attemptIdRef.current || stepRef.current !== "camera") {
          stream.getTracks().forEach((t) => {
            try { t.stop(); } catch {}
          });
          return;
        }

        if (isCancelled?.()) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const track = stream.getVideoTracks()[0] || null;
        trackRef.current = track;

        const video = videoRef.current;
        if (!video) return;

        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.muted = true;
        video.autoplay = true;
        video.srcObject = stream;

        try {
          await video.play();
        } catch {
          // Ignore iOS autoplay promise quirks when muted+playsInline is set
        }
<<<<<<< HEAD

        const ready = await waitForVideoReady(video, attemptId);
        if (!ready || attemptId !== attemptIdRef.current) return;

        const caps: ExtendedTrackCapabilities =
          track && typeof track.getCapabilities === "function"
            ? ((track.getCapabilities() as ExtendedTrackCapabilities) || {})
            : {};
        capsRef.current = caps;

        // Continuous autofocus when supported (Android Chrome/WebView)
        if (track && Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
          const focusConstraint: ExtendedConstraintSet = { focusMode: "continuous" };
          track.applyConstraints({ advanced: [focusConstraint] }).catch(() => {});
        }

        setSupportsTorch(Boolean(caps.torch));
        setFlashOn(false);

        const hasZoom = Boolean(
          caps.zoom &&
            typeof caps.zoom.min === "number" &&
            typeof caps.zoom.max === "number" &&
            caps.zoom.max > caps.zoom.min
        );
        if (hasZoom && caps.zoom && track) {
          const minZ = caps.zoom.min;
          const maxZ = Math.min(caps.zoom.max, 4);
          const stepZ = caps.zoom.step || 0.1;
          const settings = typeof track.getSettings === "function" ? (track.getSettings() as { zoom?: number }) : {};
          const initialZ = typeof settings.zoom === "number" ? settings.zoom : minZ;
          setZoomRange({ min: minZ, max: maxZ, step: stepZ });
          setZoomVal(initialZ);
          currentZoomRef.current = initialZ;
          setSupportsZoom(true);
=======
      } catch (err: unknown) {
        if (isCancelled?.()) return;
        const error = err as Error;
        console.warn("Live camera start failed:", error);
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setCameraError(
            "Camera permission was denied. Please allow camera access in your settings, or use the native camera option below."
          );
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          setCameraError("No camera device was found on this phone.");
>>>>>>> e5c75ea (update the live receipt)
        } else {
          setSupportsZoom(false);
        }

        prevLumaRef.current = null;
        autoSharpSinceRef.current = 0;
        autoCooldownUntilRef.current = Date.now() + 900;
        setAutoProgress(0);

        setIsStarting(false);
        setCameraReady(true);
        requestAnimationFrame(() => recomputeDimensions());
      } catch (err: unknown) {
        if (attemptId !== attemptIdRef.current) return;
        stopCamera();
        const name = (err as Error)?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
          setFallbackReason("denied");
        } else {
          setFallbackReason("unavailable");
        }
      }
    },
    [acquireCameraStream, recomputeDimensions, stopCamera, waitForVideoReady]
  );

<<<<<<< HEAD
  const handleClose = useCallback(() => {
    if (isVerifyingRef.current) return;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
=======
  // Initialize camera on mount and when facing mode changes (if in camera step)
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (step === "camera") {
      timer = setTimeout(() => {
        void startCamera(facingMode, () => cancelled);
      }, 0);
    }
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopCamera();
    };
  }, [step, facingMode, startCamera, stopCamera]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [stopCamera]);

  // Switch camera front/back
  const handleSwitchCamera = () => {
    haptic("selection");
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Close scanner and cleanup
  const handleClose = () => {
>>>>>>> e5c75ea (update the live receipt)
    haptic("light");
    stopCamera();
    clearCapturedPhoto();
    onClose();
  }, [clearCapturedPhoto, onClose, stopCamera]);

  // Expand Telegram WebApp, hook BackButton, and handle background/visibility cleanup
  useEffect(() => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    try { tg?.expand?.(); } catch {}

    const hasLiveCam =
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices) &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    if (!hasLiveCam && galleryInputRef.current) {
      pickingFileRef.current = true;
      try { galleryInputRef.current.click(); } catch { pickingFileRef.current = false; }
    }

<<<<<<< HEAD
    const startTimer = setTimeout(() => {
=======
    haptic("medium");

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context");

      // Draw the video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Stop camera tracks right away to save battery & release hardware
      stopCamera();

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );

      if (!blob) throw new Error("Could not capture photo");

      // Compress client-side to max 1400px / 0.85 quality
      const compressed = await compressReceiptImage(blob, {
        maxDimension: 1400,
        quality: 0.85,
        fileName: `receipt_live_${Date.now()}.jpg`,
      });

      // Set preview
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(compressed);
      setPreviewUrl(url);
      setCapturedFile(compressed);
      setStep("preview");
    } catch (err: unknown) {
      console.error("Capture error:", err);
      showToast("Failed to capture image. Please try again.", "error");
      // Restart camera
>>>>>>> e5c75ea (update the live receipt)
      startCamera(facingMode);
    }, 0);

    const backHandler = () => handleClose();
    try {
      if (tg?.BackButton) {
        tg.BackButton.show();
        tg.BackButton.onClick(backHandler);
      }
    } catch {}

    const handleBackground = () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (streamRef.current) stopCamera();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBackground();
        return;
      }
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = setTimeout(() => {
        pickingFileRef.current = false;
        if (
          stepRef.current === "camera" &&
          !isVerifyingRef.current &&
          !processingFileRef.current &&
          !streamRef.current &&
          !fallbackReasonRef.current
        ) {
          if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
            startCamera(facingMode);
          }
        }
      }, 320);
    };

    const handlePageHide = () => {
      stopCamera();
      clearCapturedPhoto();
    };

    const tgEvents = tg as unknown as {
      onEvent?: (eventType: string, cb: () => void) => void;
      offEvent?: (eventType: string, cb: () => void) => void;
    } | undefined;

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    try { tgEvents?.onEvent?.("deactivated", handleBackground); } catch {}

    return () => {
      clearTimeout(startTimer);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      try { tgEvents?.offEvent?.("deactivated", handleBackground); } catch {}
      try { tg?.BackButton?.offClick?.(backHandler); } catch {}
      stopCamera();
      clearCapturedPhoto();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture photo (single-pass crop to frame + 3% margin, <= 1400px wide & <= 2600px tall, JPEG 0.85)
  const handleCapture = useCallback(
    async (fromAuto = false) => {
      if (!cameraReadyRef.current || isCapturingRef.current || isVerifyingRef.current) return;
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        if (!fromAuto) showToast("Camera is still starting…", "info");
        return;
      }

      isCapturingRef.current = true;
      setAutoProgress(0);
      autoSharpSinceRef.current = 0;

      haptic(fromAuto ? "success" : "light");
      try { navigator.vibrate?.(18); } catch {}

      setShutterFlash(false);
      requestAnimationFrame(() => setShutterFlash(true));

      flashBeforePreviewRef.current = flashOnRef.current;
      if (flashOnRef.current) {
        setTorch(false);
      }

      try {
        const compressed = await cropAndCompressVideoFrame(video, frameRef.current, {
          maxWidth: 1400,
          maxHeight: 2600,
          bleedRatio: 0.03,
          quality: 0.85,
          mirrored: facingMode === "user",
        });

        if (!compressed) {
          showToast("Could not capture frame, please try again.", "error");
          return;
        }

        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        const url = URL.createObjectURL(compressed);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setCapturedFile(compressed);
        // Keep stream open behind preview so Retake returns instantaneously
        setStep("preview");
      } catch {
        showToast("Failed to capture photo. Please try again.", "error");
      } finally {
        isCapturingRef.current = false;
      }
    },
    [facingMode, setTorch, showToast]
  );

  // Live blur / motion / brightness analyzer strictly inside the active frame area
  useEffect(() => {
    if (step !== "camera" || !cameraReady || fallbackReason) return;

    const timer = setInterval(() => {
      if (document.hidden || isCapturingRef.current || !cameraReadyRef.current) return;
      const video = videoRef.current;
      if (!video || !video.videoWidth || video.readyState < 2) return;

      const crop = computeVideoFrameCrop(video, frameRef.current, 0, facingMode === "user");
      if (!crop) return;

      const shape = shapeRef.current;
      const W = shape === "wide" ? 192 : shape === "tall" ? 120 : 128;
      const H = shape === "wide" ? 144 : shape === "tall" ? 264 : 256;

      if (
        !analysisCanvasRef.current ||
        analysisSizeRef.current.w !== W ||
        analysisSizeRef.current.h !== H
      ) {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        analysisCanvasRef.current = c;
        analysisSizeRef.current = { w: W, h: H };
        prevLumaRef.current = null;
      }
      const ctx = analysisCanvasRef.current.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      try {
        ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, W, H);
      } catch {
        return;
      }

      const pixels = ctx.getImageData(0, 0, W, H).data;
      const totalPx = W * H;
      const currLuma = new Uint8Array(totalPx);
      const prevLuma = prevLumaRef.current && prevLumaRef.current.length === totalPx ? prevLumaRef.current : null;

      let lumaSum = 0;
      let diffSum = 0;
      let lumaCount = 0;

      for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
        const y = (pixels[i] * 77 + pixels[i + 1] * 150 + pixels[i + 2] * 29) >> 8;
        currLuma[p] = y;
        if ((p & 1) === 0) {
          lumaSum += y;
          if (prevLuma) diffSum += Math.abs(y - prevLuma[p]);
          lumaCount++;
        }
      }

      const meanLuma = lumaCount > 0 ? lumaSum / lumaCount : 128;
      const motion = prevLuma && lumaCount > 0 ? diffSum / lumaCount : 0;
      prevLumaRef.current = currLuma;

      const xStart = Math.floor(W * 0.1);
      const xEnd = Math.floor(W * 0.9);
      const yStart = Math.floor(H * 0.1);
      const yEnd = Math.floor(H * 0.9);

      let gradSum = 0;
      let edgeHits = 0;
      let interiorCount = 0;
      let minL = 255;
      let maxL = 0;

      for (let y = yStart; y < yEnd; y += 2) {
        const rowOffset = y * W;
        for (let x = xStart; x < xEnd; x += 2) {
          const idx = rowOffset + x;
          const c = currLuma[idx];
          if (c < minL) minL = c;
          if (c > maxL) maxL = c;
          const gx = Math.abs(currLuma[idx + 1] - currLuma[idx - 1]);
          const gy = Math.abs(currLuma[idx + W] - currLuma[idx - W]);
          const g = gx + gy;
          gradSum += g;
          if (g > 24) edgeHits++;
          interiorCount++;
        }
      }

      const meanGrad = interiorCount > 0 ? gradSum / interiorCount : 0;
      const edgeRatio = interiorCount > 0 ? edgeHits / interiorCount : 0;
      const contrast = maxL - minL;

      const isDark = meanLuma < 46;
      const isMoving = motion > 10.5;
      const isSharp = !isDark && !isMoving && contrast >= 42 && (edgeRatio >= 0.032 || meanGrad >= 9.0);

      if (isDark) {
        autoSharpSinceRef.current = 0;
        setAutoProgress(0);
        setQualityState("dark");
        setQualityText("Too dark — turn on flash or find more light");
      } else if (isMoving) {
        autoSharpSinceRef.current = 0;
        setAutoProgress(0);
        setQualityState("moving");
        setQualityText("Hold steady inside the frame");
      } else if (isSharp) {
        const now = Date.now();
        setQualityState("sharp");
        if (autoCaptureRef.current && now >= autoCooldownUntilRef.current) {
          if (!autoSharpSinceRef.current) autoSharpSinceRef.current = now;
          const elapsed = now - autoSharpSinceRef.current;
          setAutoProgress(Math.min(1, elapsed / 1000));
          setQualityText("Sharp — capturing automatically...");
          if (elapsed >= 1000) {
            autoSharpSinceRef.current = 0;
            setAutoProgress(0);
            handleCapture(true);
          }
        } else {
          setAutoProgress(0);
          setQualityText("Looks sharp — tap camera button to capture");
        }
      } else {
        autoSharpSinceRef.current = 0;
        setAutoProgress(0);
        setQualityState("blurry");
        setQualityText(DEFAULT_TIP);
      }
    }, 170);

    return () => clearInterval(timer);
  }, [cameraReady, facingMode, fallbackReason, handleCapture, step]);

  const handleStageTapFocus = (clientX: number, clientY: number) => {
    if (!cameraReadyRef.current || stepRef.current !== "camera" || fallbackReason) return;
    const video = videoRef.current;
    const modal = modalRef.current;
    if (!video || !modal) return;

    const modalRect = modal.getBoundingClientRect();
    setFocusPoint({
      x: clientX - modalRect.left,
      y: clientY - modalRect.top,
      key: Date.now(),
    });
    haptic("selection");

    const track = trackRef.current;
    if (!track || typeof track.applyConstraints !== "function") return;

    const vRect = video.getBoundingClientRect();
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    const scale = Math.max(vRect.width / vw, vRect.height / vh);
    const renderedW = vw * scale;
    const renderedH = vh * scale;
    const offsetX = (vRect.width - renderedW) / 2;
    const offsetY = (vRect.height - renderedH) / 2;

    let nx = (clientX - vRect.left - offsetX) / renderedW;
    const ny = (clientY - vRect.top - offsetY) / renderedH;
    if (facingMode === "user") nx = 1 - nx;

    const px = Math.max(0.02, Math.min(0.98, nx));
    const py = Math.max(0.02, Math.min(0.98, ny));

    const caps = capsRef.current;
    const focusConstraint: ExtendedConstraintSet = {};
    let hasConstraint = false;

    if (Array.isArray(caps.focusMode)) {
      if (caps.focusMode.includes("single-shot")) {
        focusConstraint.focusMode = "single-shot";
        hasConstraint = true;
      } else if (caps.focusMode.includes("continuous")) {
        focusConstraint.focusMode = "continuous";
        hasConstraint = true;
      }
    }
    if ("pointsOfInterest" in caps) {
      focusConstraint.pointsOfInterest = [{ x: px, y: py }];
      hasConstraint = true;
    }

    if (hasConstraint) {
      track.applyConstraints({ advanced: [focusConstraint] }).catch(() => {});
      if (focusRestoreTimerRef.current) clearTimeout(focusRestoreTimerRef.current);
      if (focusConstraint.focusMode === "single-shot" && caps.focusMode?.includes("continuous")) {
        focusRestoreTimerRef.current = setTimeout(() => {
          if (trackRef.current && cameraReadyRef.current) {
            const restore: ExtendedConstraintSet = { focusMode: "continuous" };
            trackRef.current.applyConstraints({ advanced: [restore] }).catch(() => {});
          }
        }, 1400);
      }
    }
  };

  const handleSwitchCamera = () => {
    if (isCapturingRef.current || isVerifyingRef.current) return;
    haptic("selection");
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  };

  const handleChangeFrameShape = (shape: FrameShape) => {
    haptic("selection");
    shapeRef.current = shape;
    setFrameShape(shape);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_SHAPE_KEY, shape);
    prevLumaRef.current = null;
    autoSharpSinceRef.current = 0;
    setAutoProgress(0);
    recomputeDimensions();
  };

  const handleToggleAuto = () => {
    haptic("selection");
    const next = !autoCapture;
    setAutoCapture(next);
    autoSharpSinceRef.current = 0;
    setAutoProgress(0);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_AUTO_KEY, next ? "1" : "0");
  };

  const handleSelectProvider = (p: string) => {
    haptic("selection");
    setProvider(p);
    onProviderChange?.(p);
  };

  const handleNativeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    pickingFileRef.current = false;
    const file = e.target.files?.[0];
    if (!file) return;

    processingFileRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    haptic("selection");
    stopCamera();
    showToast("Preparing photo...", "info");

    try {
      const compressed = await compressReceiptImage(file, {
        maxDimension: 1400,
        maxHeight: 2600,
        quality: 0.85,
        fileName: file.name,
      });
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(compressed);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setCapturedFile(compressed);
      setFallbackReason(null);
      setStep("preview");
    } catch {
      showToast("Could not read that photo, please try another.", "error");
    } finally {
      processingFileRef.current = false;
    }
  };

  // Instant Retake (reuses live camera stream with zero hardware reload lag)
  const handleRetake = () => {
    if (isVerifyingRef.current) return;
    haptic("light");
    clearCapturedPhoto();
    autoCooldownUntilRef.current = Date.now() + 1100;
    autoSharpSinceRef.current = 0;
    prevLumaRef.current = null;
    setAutoProgress(0);
    setQualityState("idle");
    setQualityText(DEFAULT_TIP);
    setStep("camera");

    const streamAlive = Boolean(streamRef.current && trackRef.current?.readyState === "live");
    if (streamAlive) {
      setIsStarting(false);
      setCameraReady(true);
      if (flashBeforePreviewRef.current && supportsTorch) {
        setTorch(true);
      }
      requestAnimationFrame(() => recomputeDimensions());
    } else {
      startCamera(facingMode);
    }
  };

  // Verify captured photo with step-by-step backend streaming + immediate cleanup
  const handleVerify = async () => {
    if (isVerifyingRef.current) return;
    if (!capturedFile) {
      showToast("Please capture a receipt photo first", "error");
      return;
    }

    const fileToUpload = capturedFile;
    isVerifyingRef.current = true;
    setVerifying(true);
    setVerifyStage("reading");
    haptic("medium");

    stopCamera();
    clearCapturedPhoto();
    setStep("verifying");

    let reachedBank = false;
    const fallbackTimer = setTimeout(() => {
      if (!reachedBank && isVerifyingRef.current) {
        setVerifyStage("checking_bank");
      }
    }, 1800);

    try {
<<<<<<< HEAD
      const res = await verifyImageWithProgress(fileToUpload, undefined, provider, (stage) => {
        if (stage === "checking_bank") {
          reachedBank = true;
          setVerifyStage("checking_bank");
        }
      });
=======
      // Auto-detect CBE & Telebirr on the backend without forcing provider
      const res = await verifyImage(capturedFile);
      setResult(res);
      setStep("result");
>>>>>>> e5c75ea (update the live receipt)

      clearTimeout(fallbackTimer);
      setVerifyStage("done");
      await new Promise((r) => setTimeout(r, 160));

      if (res.status === "VERIFIED") haptic("success");
      else haptic("error");

      onVerified?.(res);
      onClose();
    } catch (err: unknown) {
      clearTimeout(fallbackTimer);
      haptic("error");
      const friendlyMsg =
        (err as Error)?.message || "Could not verify receipt right now. Please try again.";
      onVerified?.({ status: "INVALID_RECEIPT", message: friendlyMsg });
      onClose();
    } finally {
      isVerifyingRef.current = false;
      setVerifying(false);
      clearCapturedPhoto();
    }
  };

  const dashOffset = 264 * (1 - Math.max(0, Math.min(1, autoProgress)));

  return (
    <div ref={modalRef} className="cf-sc-modal" role="dialog" aria-modal="true" aria-label="Verify Payment Scanner">
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleNativeFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleNativeFileChange}
      />

      {/* ── 1. LIVE CAMERA VIEW (kept mounted while in preview for 0ms Retake) ── */}
      <div className="cf-sc-view" style={{ display: step === "camera" ? "flex" : "none" }}>
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`cf-sc-video ${facingMode === "user" ? "mirrored" : ""}`}
        />

<<<<<<< HEAD
        <div className={`cf-sc-flash ${shutterFlash ? "active" : ""}`} onAnimationEnd={() => setShutterFlash(false)} />

        {focusPoint && (
          <div
            key={focusPoint.key}
            className="cf-sc-focus-ring"
            style={{ left: `${focusPoint.x}px`, top: `${focusPoint.y}px` }}
            onAnimationEnd={() => setFocusPoint(null)}
          />
        )}

        {/* Top Overlay Header */}
        <div ref={topBarRef} className="cf-sc-top-bar">
          <button type="button" className="cf-sc-icon-btn bare" onClick={handleClose} aria-label="Close scanner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="cf-sc-top-center">
            <div className="cf-sc-top-title">Verify Payment</div>
            <div className="cf-sc-pill-group" role="group" aria-label="Bank provider">
              {(["CBE", "TELEBIRR"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`cf-sc-seg-btn ${provider === p ? "active" : ""}`}
                  onClick={() => handleSelectProvider(p)}
                >
                  {p === "CBE" ? "CBE" : "Telebirr"}
                </button>
              ))}
            </div>
          </div>

          <div className="cf-sc-top-right">
            {!fallbackReason && (
              <button
                type="button"
                className="cf-sc-icon-btn"
                onClick={handleSwitchCamera}
                aria-label="Switch camera"
                title="Switch camera"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
            )}
            {supportsTorch && !fallbackReason && (
              <button
                type="button"
                className={`cf-sc-icon-btn ${flashOn ? "is-on" : ""}`}
                onClick={() => {
                  haptic("selection");
                  setTorch(!flashOn);
                }}
                aria-label="Toggle flash"
                aria-pressed={flashOn}
                title="Flash"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                </svg>
              </button>
            )}
          </div>
=======
        {/* Center: Clean Title (auto-detects CBE & Telebirr) */}
        <div style={{ textAlign: "center", pointerEvents: "none" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.15, color: "#ffffff" }}>
            {step === "preview" ? "Check Receipt Photo" : "Verify Payment"}
          </div>
          {step === "camera" && (
            <div style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255, 255, 255, 0.72)", marginTop: "2px" }}>
              Point camera at receipt
            </div>
          )}
>>>>>>> e5c75ea (update the live receipt)
        </div>

        {/* Center Stage: Open Camera Corridor Between Top & Bottom Bars */}
        <div
          ref={stageRef}
          className="cf-sc-stage"
          style={{ top: `${stageBounds.top}px`, bottom: `${stageBounds.bottom}px` }}
          onTouchStart={(e) => {
            if (e.touches.length === 2 && supportsZoom) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              pinchStartDistRef.current = Math.hypot(dx, dy);
              pinchStartZoomRef.current = currentZoomRef.current;
            } else if (e.touches.length === 1) {
              touchMovedRef.current = false;
              touchStartPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && supportsZoom && pinchStartDistRef.current > 0) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              applyZoom(pinchStartZoomRef.current * (Math.hypot(dx, dy) / pinchStartDistRef.current));
            } else if (e.touches.length === 1) {
              if (
                Math.hypot(
                  e.touches[0].clientX - touchStartPosRef.current.x,
                  e.touches[0].clientY - touchStartPosRef.current.y
                ) > 12
              ) {
                touchMovedRef.current = true;
              }
            }
          }}
          onTouchEnd={(e) => {
            if (e.touches.length < 2) pinchStartDistRef.current = 0;
            if (!touchMovedRef.current && e.changedTouches.length === 1 && e.touches.length === 0) {
              const target = e.target as HTMLElement | null;
              if (target?.closest("button, input, .cf-sc-error-card")) return;
              lastTouchTapRef.current = Date.now();
              const t = e.changedTouches[0];
              handleStageTapFocus(t.clientX, t.clientY);
            }
          }}
          onClick={(e) => {
            if (Date.now() - lastTouchTapRef.current < 650) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest("button, input, .cf-sc-error-card")) return;
            handleStageTapFocus(e.clientX, e.clientY);
          }}
        >
          {fallbackReason ? (
            <div className="cf-sc-error-card">
              <div style={{ fontSize: "40px", marginBottom: "10px" }}>
                {fallbackReason === "denied" ? "🔒" : "📷"}
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>
                {fallbackReason === "denied" ? "Camera Permission Blocked" : "Use Phone Camera or Photo"}
              </h3>
              <p style={{ fontSize: "13px", color: "#8e8e93", lineHeight: 1.45 }}>
                {fallbackReason === "denied"
                  ? "To scan receipts live, allow Camera access for Telegram in your phone Settings (or site permissions) and tap Try Again — or pick a photo right now."
                  : "Live camera preview is not available in this window. Take a photo with your camera app or choose a receipt screenshot below."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: "48px" }}
                  onClick={() => {
                    pickingFileRef.current = true;
                    nativeCameraInputRef.current?.click();
                  }}
                >
                  📸 Take Photo with Camera
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: "48px" }}
                  onClick={() => {
                    pickingFileRef.current = true;
                    galleryInputRef.current?.click();
                  }}
                >
                  🖼️ Choose from Photos
                </button>
                {fallbackReason !== "unsupported" && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ minHeight: "48px" }}
                    onClick={() => {
                      haptic("selection");
                      startCamera(facingMode);
                    }}
                  >
                    🔄 Try Live Camera Again
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />

              {/* Clean Tip Pill above Bottom Shutter */}
>>>>>>> e5c75ea (update the live receipt)
>>>>>>> dbc4981 (update the live receipt and frontend screens)
              <div
                ref={frameRef}
                className={`cf-sc-frame ${
                  qualityState === "sharp"
                    ? "is-sharp"
                    : qualityState === "dark" || qualityState === "moving"
                    ? "is-warn"
                    : ""
                }`}
                style={{
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> dbc4981 (update the live receipt and frontend screens)
                  width: `${frameDims.width}px`,
                  height: `${frameDims.height}px`,
                  marginTop: "16px",
                }}
              >
                {/* Hint sits just above the top border without squeezing the frame */}
                <div className="cf-sc-hint-above">Fit the whole receipt inside the frame</div>

                <div className="cf-sc-corner tl" />
                <div className="cf-sc-corner tr" />
                <div className="cf-sc-corner bl" />
                <div className="cf-sc-corner br" />

                {isStarting && (
                  <div className="cf-sc-starting">
                    <div className="cf-sc-spinner" />
                    <span>Starting camera...</span>
                  </div>
                )}
              </div>

              {/* Live light & sharpness pill anchored inside bottom of stage */}
              {!isStarting && (
                <div
                  className={`cf-sc-tip-pill ${
                    qualityState === "sharp"
                      ? "state-sharp"
                      : qualityState === "dark" || qualityState === "moving"
                      ? "state-warn"
                      : ""
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                  </svg>
                  <span>{qualityText}</span>
                </div>
              )}
=======
                  position: "absolute",
                  bottom: "calc(126px + env(safe-area-inset-bottom, 0px))",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(16, 22, 32, 0.82)",
                  backdropFilter: "blur(10px)",
                  padding: "7px 14px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255, 255, 255, 0.16)",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.94)",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  maxWidth: "88vw",
                  pointerEvents: "none",
                  zIndex: 15,
                }}
              >
                Make sure the receipt is flat, well lit and all text is clear.
              </div>

              {/* Bottom Camera Controls Bar */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "24px 20px",
                  paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
                  zIndex: 20,
                }}
              >
                {/* Big Shutter Button */}
                <button
                  type="button"
                  onClick={handleCapture}
                  aria-label="Capture photo"
                  style={{
                    width: "76px",
                    height: "76px",
                    borderRadius: "50%",
                    border: "4px solid #ffffff",
                    background: "transparent",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "transform 0.1s ease",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: "#ffffff",
                    }}
                  />
                </button>
              </div>
>>>>>>> e5c75ea (update the live receipt)
            </>
          )}
        </div>

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> dbc4981 (update the live receipt and frontend screens)
        {/* Combined Bottom HUD: Shape Bar + Optional Zoom + Dark Dock */}
        {!fallbackReason && (
          <div ref={bottomHudRef} className="cf-sc-bottom-hud">
            {supportsZoom && (
              <div className="cf-sc-zoom-wrap">
                <span style={{ fontSize: "11px", color: "#8e8e93", fontWeight: 700 }}>Zoom</span>
                <input
                  type="range"
                  className="cf-sc-zoom-slider"
                  min={zoomRange.min}
                  max={zoomRange.max}
                  step={zoomRange.step}
                  value={zoomVal}
                  onChange={(e) => applyZoom(parseFloat(e.target.value))}
                  aria-label="Camera zoom"
                />
                <span style={{ fontSize: "11px", fontWeight: 700, minWidth: "32px", textAlign: "right" }}>
                  {zoomVal.toFixed(1)}x
                </span>
<<<<<<< HEAD
=======
=======
      {/* ── 2. PREVIEW SCREEN (Retake / Verify) ── */}
      {step === "preview" && previewUrl && (
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            background: "#000000",
            overflow: "hidden",
          }}
        >
          {/* Image Preview Container */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              paddingTop: "70px",
              paddingBottom: "110px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Receipt preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>

          {/* Action Buttons: Retake & Verify */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "20px",
              paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
              background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0) 100%)",
              display: "flex",
              gap: "12px",
              zIndex: 20,
            }}
          >
            <button
              type="button"
              onClick={handleRetake}
              disabled={loading}
              style={{
                flex: 1,
                padding: "15px",
                borderRadius: "14px",
                background: "rgba(44, 44, 46, 0.9)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>🔄</span> Retake
            </button>

            <button
              type="button"
              onClick={handleVerify}
              disabled={loading}
              style={{
                flex: 2,
                padding: "15px",
                borderRadius: "14px",
                background: "#0a84ff",
                border: "none",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(10, 132, 255, 0.4)",
              }}
            >
              <span>⚡</span> Verify Receipt
            </button>
          </div>
        </div>
      )}

      {/* ── 3. VERIFYING LOADING OVERLAY ── */}
      {step === "verifying" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            textAlign: "center",
            background: "#000000",
            zIndex: 30,
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              border: "4px solid rgba(10, 132, 255, 0.2)",
              borderTopColor: "#0a84ff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              marginBottom: "24px",
            }}
          />
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
            Checking your receipt...
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", maxWidth: "280px" }}>
            Reading QR code, reference numbers, and validating with bank records.
          </p>
        </div>
      )}

      {/* ── 4. RESULT SCREEN ── */}
      {step === "result" && result && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "20px",
            paddingTop: "76px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
            overflowY: "auto",
            background: "var(--tg-theme-bg-color, #1c1c1e)",
          }}
        >
          {/* Result Card */}
          <div
            style={{
              padding: "24px 20px",
              borderRadius: "18px",
              border:
                result.status === "VERIFIED"
                  ? "2px solid #30d158"
                  : result.status === "FLAGGED_DUPLICATE"
                  ? "2px solid #ff453a"
                  : result.status === "AMOUNT_MISMATCH"
                  ? "2px solid #ffd60a"
                  : "2px solid #ff453a",
              background:
                result.status === "VERIFIED"
                  ? "rgba(48, 209, 88, 0.12)"
                  : result.status === "FLAGGED_DUPLICATE"
                  ? "rgba(255, 69, 58, 0.12)"
                  : result.status === "AMOUNT_MISMATCH"
                  ? "rgba(255, 214, 10, 0.12)"
                  : "rgba(255, 69, 58, 0.12)",
              marginBottom: "16px",
            }}
          >
            {/* Header with big Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  borderRadius: "50%",
                  background:
                    result.status === "VERIFIED"
                      ? "#30d158"
                      : result.status === "FLAGGED_DUPLICATE"
                      ? "#ff453a"
                      : result.status === "AMOUNT_MISMATCH"
                      ? "#ffd60a"
                      : "#ff453a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  color: result.status === "AMOUNT_MISMATCH" ? "#000000" : "#ffffff",
                  flexShrink: 0,
                }}
              >
                {result.status === "VERIFIED"
                  ? "✓"
                  : result.status === "FLAGGED_DUPLICATE"
                  ? "✕"
                  : result.status === "AMOUNT_MISMATCH"
                  ? "!"
                  : "✕"}
              </div>

              <div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>
                  {result.status === "VERIFIED"
                    ? "Payment Verified!"
                    : result.status === "FLAGGED_DUPLICATE"
                    ? "Duplicate Payment!"
                    : result.status === "AMOUNT_MISMATCH"
                    ? "Amount Mismatch"
                    : "Could Not Verify Receipt"}
                </h3>
                <p style={{ fontSize: "13px", color: "var(--tg-theme-hint-color, #8e8e93)", marginTop: "4px" }}>
                  {result.status === "VERIFIED"
                    ? "Legitimate transaction confirmed by bank."
                    : result.status === "FLAGGED_DUPLICATE"
                    ? "Warning: This receipt was already verified! Do not release items."
                    : result.status === "AMOUNT_MISMATCH"
                    ? "Amount on receipt does not match expected payment."
                    : result.message || "Could not confirm this receipt."}
                </p>
              </div>
            </div>

            {/* Helpful hint for blurry or unreadable photos */}
            {isUnreadable && (
              <div
                style={{
                  background: "rgba(255, 214, 10, 0.15)",
                  border: "1px solid rgba(255, 214, 10, 0.3)",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  margin: "14px 0",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "18px" }}>💡</span>
                <div style={{ fontSize: "13px", color: "#ffd60a", lineHeight: 1.4 }}>
                  <strong>Tip for camera scans:</strong> Hold steady, use good light, and keep receipt clear.
                </div>
>>>>>>> e5c75ea (update the live receipt)
>>>>>>> dbc4981 (update the live receipt and frontend screens)
              </div>
            )}

            <div className="cf-sc-toolbar">
              <div className="cf-sc-pill-group" role="group" aria-label="Frame shape">
                {(
                  [
                    { id: "screenshot", label: "Screenshot" },
                    { id: "tall", label: "Tall receipt" },
                    { id: "wide", label: "Wide" },
                  ] as const
                ).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`cf-sc-seg-btn subtle ${frameShape === s.id ? "active" : ""}`}
                    onClick={() => handleChangeFrameShape(s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={`cf-sc-mini-pill ${autoCapture ? "active" : ""}`}
                onClick={handleToggleAuto}
                aria-pressed={autoCapture}
              >
                {autoCapture ? "Auto: ON" : "Auto"}
              </button>

              <button
                type="button"
                className="cf-sc-mini-pill"
                onClick={() => {
                  pickingFileRef.current = true;
                  galleryInputRef.current?.click();
                }}
                aria-label="Choose from photos"
              >
                🖼️
              </button>
            </div>

            <div className="cf-sc-dock">
              <button type="button" className="cf-sc-dock-action" onClick={handleClose} aria-label="Cancel">
                <div className="cf-sc-dock-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <span>Cancel</span>
              </button>

              <button
                type="button"
                className={`cf-sc-shutter ${qualityState === "sharp" ? "is-sharp" : ""} ${
                  pulseShutterHint ? "pulse-hint" : ""
                }`}
                onClick={() => handleCapture(false)}
                onAnimationEnd={() => setPulseShutterHint(false)}
                disabled={!cameraReady}
                aria-disabled={!cameraReady}
                aria-label="Capture receipt photo"
              >
                {autoCapture && (
                  <svg className="cf-sc-auto-ring" viewBox="0 0 92 92">
                    <circle
                      cx="46"
                      cy="46"
                      r="42"
                      fill="none"
                      stroke="#30d158"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={264}
                      strokeDashoffset={dashOffset}
                      style={{ transition: "stroke-dashoffset 0.12s linear" }}
                    />
                  </svg>
                )}
                <div className="cf-sc-shutter-inner">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 3L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                </div>
              </button>

              <button
                type="button"
                className="cf-sc-dock-action"
                style={{ opacity: 0.45 }}
                onClick={() => {
                  haptic("light");
                  setPulseShutterHint(false);
                  requestAnimationFrame(() => setPulseShutterHint(true));
                  showToast("Tap the blue camera button to take a photo first", "info");
                }}
                aria-label="Verify after capture"
              >
                <div className="cf-sc-dock-circle primary">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <span>Verify</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. PREVIEW VIEW (Same Tall Frame, Entire Photo Visible) ── */}
      {step === "preview" && previewUrl && (
        <div className="cf-sc-view">
          <div ref={previewTopRef} className="cf-sc-top-bar">
            <button type="button" className="cf-sc-icon-btn bare" onClick={handleClose} aria-label="Close preview">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="cf-sc-top-center">
              <div className="cf-sc-top-title">Check Receipt Photo</div>
              <div className="cf-sc-pill-group" role="group" aria-label="Bank provider">
                {(["CBE", "TELEBIRR"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`cf-sc-seg-btn ${provider === p ? "active" : ""}`}
                    onClick={() => handleSelectProvider(p)}
                  >
                    {p === "CBE" ? "CBE" : "Telebirr"}
                  </button>
                ))}
              </div>
            </div>

            <div className="cf-sc-top-right" />
          </div>

          <div
            className="cf-sc-preview-stage"
            style={{ top: `${previewBounds.top}px`, bottom: `${previewBounds.bottom}px` }}
          >
            <div
              className="cf-sc-preview-box"
              style={{ width: `${previewDims.width}px`, height: `${previewDims.height}px` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Captured receipt preview"
                style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              />
              <div className="cf-sc-corner tl" />
              <div className="cf-sc-corner tr" />
              <div className="cf-sc-corner bl" />
              <div className="cf-sc-corner br" />
            </div>
          </div>

          <div ref={previewDockRef} className="cf-sc-preview-dock">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRetake}
              disabled={verifying}
              style={{ flex: 1, minHeight: "52px", borderRadius: "14px", fontSize: "16px" }}
            >
              ↺ Retake
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleVerify}
              disabled={verifying}
              style={{ flex: 1.4, minHeight: "52px", borderRadius: "14px", fontSize: "16px" }}
            >
              Verify →
            </button>
          </div>
        </div>
      )}

      {/* ── 3. STEP-BY-STEP VERIFYING VIEW ── */}
      {step === "verifying" && (
        <div className="cf-sc-view" style={{ padding: "30px 24px" }}>
          <div className="cf-sc-verify-card">
            <div className="cf-sc-spinner" style={{ width: "48px", height: "48px", borderWidth: "4px", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: "19px", fontWeight: 800, marginBottom: "4px" }}>Verifying Payment</h3>
            <p style={{ fontSize: "13px", color: "#8e8e93" }}>Please wait a moment</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px", textAlign: "left" }}>
              <div className={`cf-sc-step ${verifyStage === "reading" ? "active" : "done"}`}>
                <div className="cf-sc-step-dot">{verifyStage === "reading" ? "" : "✓"}</div>
                <span>Reading receipt...</span>
              </div>
              <div
                className={`cf-sc-step ${
                  verifyStage === "checking_bank" ? "active" : verifyStage === "done" ? "done" : ""
                }`}
              >
                <div className="cf-sc-step-dot">
                  {verifyStage === "done" ? "✓" : verifyStage === "checking_bank" ? "" : "2"}
                </div>
                <span>Checking with the bank...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
