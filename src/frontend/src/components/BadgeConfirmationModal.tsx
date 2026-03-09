import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface BadgeConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (badgeId: string) => void;
  loading: boolean;
  error: string | null;
}

export default function BadgeConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  error,
}: BadgeConfirmationModalProps) {
  const [badgeInput, setBadgeInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) {
      setBadgeInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!badgeInput.trim()) return;
    onConfirm(badgeInput.trim());
  }

  function handleClose() {
    if (loading) return;
    setBadgeInput("");
    onClose();
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
            <span className="text-amber-400 font-semibold">Badge #</span> to
            submit your timesheet to Management.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="badge-input"
              className="flex items-center gap-2 text-sm font-semibold text-slate-300"
            >
              <BadgeCheck className="w-4 h-4 text-amber-400" />
              Badge #
            </label>
            <input
              ref={inputRef}
              id="badge-input"
              type="text"
              value={badgeInput}
              onChange={(e) => setBadgeInput(e.target.value)}
              placeholder="Enter your badge number"
              disabled={loading}
              autoComplete="off"
              className={`w-full bg-navy-800 border rounded-xl px-4 py-3 text-white text-base placeholder:text-slate-500 focus:outline-none transition-all ${
                error
                  ? "border-red-500/70 ring-2 ring-red-500/30"
                  : "border-navy-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              } disabled:opacity-60`}
            />
            {error && (
              <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              type="submit"
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
            <Button
              type="button"
              variant="ghost"
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
