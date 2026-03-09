import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQRScanner } from "@/qr-code/useQRScanner";
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  CameraOff,
  Keyboard,
  Loader2,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface BadgeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (badgeId: string) => void;
  loading: boolean;
  error: string | null;
}

type Mode = "manual" | "scan";

export default function BadgeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  error,
}: BadgeConfirmationModalProps) {
  const [badgeInput, setBadgeInput] = useState("");
  const [mode, setMode] = useState<Mode>("manual");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    qrResults,
    isScanning,
    isActive,
    isSupported,
    error: camError,
    isLoading: camLoading,
    startScanning,
    stopScanning,
    videoRef,
    canvasRef,
  } = useQRScanner({
    facingMode: "environment",
    scanInterval: 150,
    maxResults: 1,
  });

  // Auto-fill from scan result
  useEffect(() => {
    if (qrResults.length > 0) {
      setBadgeInput(qrResults[0].data);
      stopScanning();
      setMode("manual");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [qrResults, stopScanning]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setBadgeInput("");
      setMode("manual");
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      stopScanning();
      setMode("manual");
    }
  }, [isOpen, stopScanning]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!badgeInput.trim()) return;
    onConfirm(badgeInput.trim());
  }

  function handleClose() {
    if (loading) return;
    stopScanning();
    setBadgeInput("");
    setMode("manual");
    onClose();
  }

  function switchToScan() {
    setMode("scan");
    startScanning();
  }

  function switchToManual() {
    stopScanning();
    setMode("manual");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="bg-navy-900 border border-navy-700 text-slate-100 max-w-sm mx-auto shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 mx-auto">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-white">
            Confirm Submission
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400 text-sm leading-relaxed">
            Enter your{" "}
            <span className="text-amber-400 font-semibold">Badge #</span> or
            scan your badge card to submit your timesheet to Management.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle — only show if camera supported */}
        {isSupported && (
          <div className="flex gap-1 bg-navy-800 rounded-xl p-1">
            <button
              type="button"
              data-ocid="badge.manual_tab"
              onClick={switchToManual}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                mode === "manual"
                  ? "bg-amber-500 text-navy-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Keyboard className="w-4 h-4" />
              Manual
            </button>
            <button
              type="button"
              data-ocid="badge.scan_tab"
              onClick={switchToScan}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                mode === "scan"
                  ? "bg-amber-500 text-navy-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ScanLine className="w-4 h-4" />
              Scan Card
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-1 space-y-4">
          {mode === "manual" ? (
            <div className="space-y-2">
              <label
                htmlFor="badge-input"
                className="flex items-center gap-2 text-sm font-semibold text-slate-300"
              >
                <BadgeCheck className="w-4 h-4 text-amber-400" />
                Badge #
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  id="badge-input"
                  type="text"
                  value={badgeInput}
                  onChange={(e) => setBadgeInput(e.target.value)}
                  placeholder="Enter your badge number"
                  disabled={loading}
                  autoComplete="off"
                  className={`flex-1 bg-navy-800 border rounded-xl px-4 py-3 text-white text-base placeholder:text-slate-500 focus:outline-none transition-all ${
                    error
                      ? "border-red-500/70 ring-2 ring-red-500/30"
                      : "border-navy-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                  } disabled:opacity-60`}
                />
                {isSupported && (
                  <button
                    type="button"
                    data-ocid="badge.scan_button"
                    onClick={switchToScan}
                    disabled={loading}
                    title="Scan badge card"
                    className="flex items-center justify-center w-12 h-12 rounded-xl border border-navy-600 bg-navy-800 text-amber-400 hover:border-amber-400/50 hover:bg-amber-500/10 transition-all disabled:opacity-50"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                )}
              </div>
              {error && (
                <div
                  data-ocid="badge.error_state"
                  className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            /* Scan Mode */
            <div className="space-y-3">
              <div
                className="relative bg-black rounded-xl overflow-hidden"
                style={{ aspectRatio: "4/3" }}
              >
                {/* Video element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Hidden canvas for QR processing */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Loading overlay */}
                {camLoading && (
                  <div
                    data-ocid="badge.loading_state"
                    className="absolute inset-0 flex flex-col items-center justify-center bg-navy-900/90 gap-3"
                  >
                    <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    <span className="text-slate-300 text-sm">
                      Starting camera...
                    </span>
                  </div>
                )}

                {/* Camera error */}
                {camError && !camLoading && (
                  <div
                    data-ocid="badge.error_state"
                    className="absolute inset-0 flex flex-col items-center justify-center bg-navy-900/90 gap-3 px-4"
                  >
                    <CameraOff className="w-8 h-8 text-red-400" />
                    <span className="text-red-400 text-sm text-center">
                      {camError?.message ?? "Camera error"}
                    </span>
                  </div>
                )}

                {/* Scanning frame overlay */}
                {(isActive || isScanning) && !camLoading && !camError && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-48 h-48">
                      {/* Corner brackets */}
                      <div
                        className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-amber-400 rounded-tl-md"
                        style={{ borderWidth: "3px 0 0 3px" }}
                      />
                      <div
                        className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-amber-400 rounded-tr-md"
                        style={{ borderWidth: "3px 3px 0 0" }}
                      />
                      <div
                        className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-amber-400 rounded-bl-md"
                        style={{ borderWidth: "0 0 3px 3px" }}
                      />
                      <div
                        className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-amber-400 rounded-br-md"
                        style={{ borderWidth: "0 3px 3px 0" }}
                      />
                      {/* Scan line animation */}
                      <div
                        className="absolute left-2 right-2 h-0.5 bg-amber-400/70 animate-bounce"
                        style={{ top: "50%" }}
                      />
                    </div>
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                      <span className="text-amber-400 text-xs font-semibold bg-black/60 px-3 py-1 rounded-full">
                        Position badge barcode in frame
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                data-ocid="badge.stop_scan_button"
                onClick={switchToManual}
                className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-white text-sm transition-colors"
              >
                <Keyboard className="w-4 h-4" />
                Switch to manual entry
              </button>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            {mode === "manual" && (
              <Button
                type="submit"
                data-ocid="badge.submit_button"
                disabled={loading || !badgeInput.trim()}
                className="w-full bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Submit to Management"
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              data-ocid="badge.cancel_button"
              onClick={handleClose}
              disabled={loading}
              className="w-full text-slate-400 hover:text-white hover:bg-navy-800 rounded-xl"
            >
              Cancel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
