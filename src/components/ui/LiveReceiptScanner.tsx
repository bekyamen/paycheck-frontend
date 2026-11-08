"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { verifyImage, VerificationResult } from "@/lib/api";
import { compressReceiptImage } from "@/lib/imageCompressor";
import { haptic } from "@/lib/telegram";

interface LiveReceiptScannerProps {
  onClose: () => void;
  onVerified?: (result: VerificationResult) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  initialProvider?: string;
  onProviderChange?: (provider: string) => void;
}

type ScannerStep = "camera" | "preview" | "verifying" | "result";

export default function LiveReceiptScanner({
  onClose,
  onVerified,
  showToast,
  initialProvider = "CBE",
  onProviderChange,
}: LiveReceiptScannerProps) {
  const [step, setStep] = useState<ScannerStep>("camera");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>(initialProvider);

  // Photo & Preview states
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Verification result & loading
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Keep track of previewUrl for cleanup
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  // Clean stop of all camera tracks
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(
    async (mode: "environment" | "user") => {
      stopCamera();
      setCameraError(null);

      // Check browser support
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "Camera streaming is not supported on this browser or Telegram client. You can take a photo with your device's native camera below."
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay policy or inline play quirk
          }
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.warn("Live camera start failed:", error);
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setCameraError(
            "Camera permission was denied. Please allow camera access in your settings, or use the native camera option below."
          );
        } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
          setCameraError("No camera device was found on this phone.");
        } else {
          setCameraError(
            "Could not start live camera preview. You can use your phone's native camera or choose a photo below."
          );
        }
      }
    },
    [stopCamera]
  );

  // Initialize camera on mount and when facing mode changes (if in camera step)
  useEffect(() => {
    if (step === "camera") {
      startCamera(facingMode);
    }
    return () => {
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
    haptic("light");
    stopCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  // Capture frame from live video
  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      showToast("Camera is not ready yet. Please wait a moment.", "error");
      return;
    }

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

      // Compress client-side to max 1280px / 0.82 quality
      const compressed = await compressReceiptImage(blob, {
        maxDimension: 1280,
        quality: 0.82,
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
      startCamera(facingMode);
    }
  };

  // Handle fallback file selection from native camera or file input
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    haptic("selection");
    try {
      stopCamera();
      showToast("Processing photo...", "info");
      const compressed = await compressReceiptImage(file, {
        maxDimension: 1280,
        quality: 0.82,
        fileName: file.name,
      });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(compressed);
      setPreviewUrl(url);
      setCapturedFile(compressed);
      setStep("preview");
    } catch {
      showToast("Could not process selected image", "error");
    }
  };

  // Retake photo: discard captured photo, restart camera
  const handleRetake = () => {
    haptic("light");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCapturedFile(null);
    setResult(null);
    setStep("camera");
  };

  // Verify the captured photo
  const handleVerify = async () => {
    if (!capturedFile) {
      showToast("No photo captured to verify", "error");
      return;
    }

    if (loading) return; // Prevent double-taps

    haptic("medium");
    setLoading(true);
    setStep("verifying");

    try {
      const res = await verifyImage(capturedFile, undefined, provider);
      setResult(res);
      setStep("result");

      if (res.status === "VERIFIED") {
        haptic("success");
      } else {
        haptic("error");
      }

      if (onVerified) {
        onVerified(res);
      }
    } catch (err: unknown) {
      haptic("error");
      const msg = (err as Error).message || "Verification failed";
      // Construct a friendly failure result
      const failResult: VerificationResult = {
        status: "INVALID_RECEIPT",
        message: msg,
      };
      setResult(failResult);
      setStep("result");
    } finally {
      setLoading(false);
    }
  };

  // Scan another receipt: reset result and return directly to live camera
  const handleScanAnother = () => {
    haptic("selection");
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setCapturedFile(null);
    setResult(null);
    setStep("camera");
  };

  const isUnreadable =
    result &&
    (result.status === "INVALID_RECEIPT" ||
      result.status === "INVALID" ||
      result.status === "FAILED_UPSTREAM" ||
      result.status === "UNKNOWN" ||
      result.status === "FAILED");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000000",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Hidden file input for native camera fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {/* ── TOP HEADER / NAV BAR ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close camera"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(30, 30, 32, 0.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        {/* Center: Bank Selector Pills */}
        <div
          style={{
            display: "inline-flex",
            background: "rgba(30, 30, 32, 0.85)",
            backdropFilter: "blur(12px)",
            borderRadius: "20px",
            padding: "3px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            gap: "2px",
          }}
        >
          {[
            { id: "CBE", label: "🏦 CBE" },
            { id: "TELEBIRR", label: "📱 Telebirr" },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={loading}
              onClick={() => {
                haptic("selection");
                setProvider(p.id);
                if (onProviderChange) onProviderChange(p.id);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "16px",
                border: "none",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                background: provider === p.id ? "var(--tg-theme-button-color, #0a84ff)" : "transparent",
                color: provider === p.id ? "#ffffff" : "var(--tg-theme-hint-color, #8e8e93)",
                transition: "all 0.15s ease",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Switch Camera Button (only active in camera step without error) */}
        {step === "camera" && !cameraError ? (
          <button
            type="button"
            onClick={handleSwitchCamera}
            aria-label="Switch camera"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(30, 30, 32, 0.75)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            🔄
          </button>
        ) : (
          <div style={{ width: "40px" }} />
        )}
      </div>

      {/* ── 1. CAMERA VIEW ── */}
      {step === "camera" && (
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#000000",
          }}
        >
          {cameraError ? (
            /* Fallback Screen if live camera blocked/unsupported */
            <div
              style={{
                padding: "32px 24px",
                maxWidth: "380px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "rgba(255, 214, 10, 0.15)",
                  color: "#ffd60a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                }}
              >
                📷
              </div>
              <h2 style={{ fontSize: "19px", fontWeight: 700 }}>Camera Access Notice</h2>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                {cameraError}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: "15px",
                  fontWeight: 600,
                  borderRadius: "12px",
                  background: "#0a84ff",
                  color: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                📸 Take Photo with Native Camera
              </button>
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#8e8e93",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: "8px",
                }}
              >
                Or choose from photo gallery
              </button>
            </div>
          ) : (
            /* Live Video Stream View */
            <>
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

              {/* Viewfinder Frame Guide Overlay */}
              <div
                style={{
                  position: "relative",
                  width: "82%",
                  maxWidth: "340px",
                  aspectRatio: "3 / 4",
                  borderRadius: "20px",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingBottom: "16px",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              >
                {/* 4 Corner Markers */}
                {/* Top-Left */}
                <div
                  style={{
                    position: "absolute",
                    top: "-2px",
                    left: "-2px",
                    width: "32px",
                    height: "32px",
                    borderTop: "4px solid #0a84ff",
                    borderLeft: "4px solid #0a84ff",
                    borderTopLeftRadius: "16px",
                  }}
                />
                {/* Top-Right */}
                <div
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    width: "32px",
                    height: "32px",
                    borderTop: "4px solid #0a84ff",
                    borderRight: "4px solid #0a84ff",
                    borderTopRightRadius: "16px",
                  }}
                />
                {/* Bottom-Left */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    left: "-2px",
                    width: "32px",
                    height: "32px",
                    borderBottom: "4px solid #0a84ff",
                    borderLeft: "4px solid #0a84ff",
                    borderBottomLeftRadius: "16px",
                  }}
                />
                {/* Bottom-Right */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    width: "32px",
                    height: "32px",
                    borderBottom: "4px solid #0a84ff",
                    borderRight: "4px solid #0a84ff",
                    borderBottomRightRadius: "16px",
                  }}
                />

                {/* Hint badge inside the frame */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.7)",
                    backdropFilter: "blur(8px)",
                    padding: "8px 14px",
                    borderRadius: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#ffffff",
                    textAlign: "center",
                    maxWidth: "90%",
                  }}
                >
                  Place the receipt inside the frame
                </div>
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
                  justifyContent: "space-around",
                  background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
                  zIndex: 20,
                }}
              >
                {/* Native Picker shortcut */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "rgba(44, 44, 46, 0.8)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                    cursor: "pointer",
                  }}
                  title="Choose from files / gallery"
                >
                  🖼️
                </button>

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

                {/* Spacer to center shutter */}
                <div style={{ width: "44px" }} />
              </div>
            </>
          )}
        </div>
      )}

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
                  <strong>Tip for camera scans:</strong> Hold steady, use good light, and fill the frame.
                </div>
              </div>
            )}

            {/* Key Receipt Details */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "14px",
                paddingTop: "14px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {result.amount !== undefined && result.amount !== null && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--tg-theme-hint-color, #8e8e93)" }}>Verified Amount:</span>
                  <strong
                    style={{
                      fontSize: "18px",
                      color: result.status === "VERIFIED" ? "#30d158" : "inherit",
                    }}
                  >
                    {!isNaN(Number(result.amount))
                      ? Number(result.amount).toFixed(2)
                      : String(result.amount)}{" "}
                    ETB
                  </strong>
                </div>
              )}

              {result.txnReference && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--tg-theme-hint-color, #8e8e93)" }}>Reference:</span>
                  <code
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    {result.txnReference}
                  </code>
                </div>
              )}

              {result.provider && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--tg-theme-hint-color, #8e8e93)" }}>Bank / Provider:</span>
                  <strong>{result.provider}</strong>
                </div>
              )}

              {result.payerName && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--tg-theme-hint-color, #8e8e93)" }}>Payer Name:</span>
                  <span>{result.payerName}</span>
                </div>
              )}

              {result.payerPhone && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--tg-theme-hint-color, #8e8e93)" }}>Payer Phone:</span>
                  <span>{result.payerPhone}</span>
                </div>
              )}

              {result.verifiedAt && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--tg-theme-hint-color, #8e8e93)" }}>Verified At:</span>
                  <span>{new Date(result.verifiedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleScanAnother}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "14px",
                background: "#0a84ff",
                color: "#ffffff",
                border: "none",
                fontSize: "16px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span>📷</span> Scan Another Receipt
            </button>

            <button
              type="button"
              onClick={handleClose}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Done / Back to Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
