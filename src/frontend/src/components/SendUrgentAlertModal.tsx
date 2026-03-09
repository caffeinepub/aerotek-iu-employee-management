import { AlertTriangle, Loader2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useSendUrgentAlert } from "../hooks/useQueries";

interface SendUrgentAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_CHARS = 500;
const MIN_CHARS = 10;

export default function SendUrgentAlertModal({
  isOpen,
  onClose,
}: SendUrgentAlertModalProps) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sendAlert = useSendUrgentAlert();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (message.trim().length < MIN_CHARS) {
      setError(`Message must be at least ${MIN_CHARS} characters.`);
      return;
    }

    try {
      await sendAlert.mutateAsync(message.trim());
      toast.success("Urgent alert sent to all staff");
      setMessage("");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send alert. Please try again.",
      );
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!sendAlert.isPending) {
      setMessage("");
      setError("");
      onClose();
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-dismiss is supplementary
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-red-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white" />
            <h2 className="text-white font-bold text-base">
              Send Urgent Alert to All Staff
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={sendAlert.isPending}
            className="text-white/80 hover:text-white transition-colors p-1 rounded disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-[oklch(0.45_0.02_250)]">
            This message will be immediately broadcast to all active staff
            members as a prominent banner notification.
          </p>

          <div className="space-y-1.5">
            <label
              htmlFor="alert-message"
              className="block text-sm font-semibold text-[oklch(0.25_0.02_255)]"
            >
              Alert Message <span className="text-red-600">*</span>
            </label>
            <textarea
              id="alert-message"
              value={message}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS) {
                  setMessage(e.target.value);
                  if (error) setError("");
                }
              }}
              placeholder="Enter your urgent alert message here..."
              rows={4}
              disabled={sendAlert.isPending}
              className="w-full px-3 py-2.5 border border-[oklch(0.82_0.01_240)] rounded-lg text-sm text-[oklch(0.2_0.02_255)] placeholder:text-[oklch(0.65_0.01_250)] focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none disabled:opacity-60 disabled:bg-[oklch(0.96_0.005_240)]"
            />
            <div className="flex items-center justify-between">
              <div>
                {error && (
                  <p className="text-red-600 text-xs font-medium">{error}</p>
                )}
              </div>
              <p
                className={`text-xs ${message.length >= MAX_CHARS ? "text-red-500 font-semibold" : "text-[oklch(0.55_0.01_250)]"}`}
              >
                {message.length}/{MAX_CHARS}
              </p>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={sendAlert.isPending}
              className="flex-1 px-4 py-2.5 border border-[oklch(0.82_0.01_240)] rounded-lg text-sm font-medium text-[oklch(0.35_0.02_250)] hover:bg-[oklch(0.95_0.005_240)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                sendAlert.isPending || message.trim().length < MIN_CHARS
              }
              className="flex-1 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sendAlert.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Send Alert
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
