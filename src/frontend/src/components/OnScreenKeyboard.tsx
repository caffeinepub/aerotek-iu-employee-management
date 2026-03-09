import { Check, Delete, X } from "lucide-react";
import React, { useEffect } from "react";

export type KeyboardLayout = "time" | "alphanumeric";

interface OnScreenKeyboardProps {
  layout: KeyboardLayout;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  label?: string;
}

const TIME_ROWS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [":", "0", "⌫"],
];

const ALPHA_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "-", "⌫"],
];

export default function OnScreenKeyboard({
  layout,
  value,
  onChange,
  onClose,
  label,
}: OnScreenKeyboardProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleKey(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
    } else {
      onChange(value + key);
    }
  }

  function handleClear() {
    onChange("");
  }

  const rows = layout === "time" ? TIME_ROWS : ALPHA_ROWS;

  return (
    <>
      {/* Backdrop */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-dismiss is supplementary */}
      <div
        className="fixed inset-0 z-40 bg-navy-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Keyboard panel */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation helper, not interactive */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-navy-900 border-t border-navy-700 shadow-2xl rounded-t-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-navy-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-navy-700">
          <div className="flex items-center gap-2">
            {label && (
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {label}
              </span>
            )}
          </div>

          {/* Current value display */}
          <div className="flex-1 mx-4">
            <div className="bg-navy-800 border border-navy-600 rounded-lg px-3 py-1.5 text-center">
              <span className="text-white font-mono text-lg tracking-widest">
                {value || <span className="text-slate-600">—</span>}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"
            aria-label="Close keyboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Keys */}
        <div className="px-3 py-3 space-y-2">
          {rows.map((row, rowIdx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: keyboard rows are static layout
            <div key={rowIdx} className="flex justify-center gap-1.5">
              {row.map((key) => {
                const isBackspace = key === "⌫";
                const isColon = key === ":";

                return (
                  <button
                    type="button"
                    key={key}
                    onPointerDown={(e) => {
                      e.preventDefault(); // prevent input blur
                      handleKey(key);
                    }}
                    className={`
                      min-w-[44px] min-h-[44px] flex items-center justify-center
                      rounded-xl font-semibold text-base transition-all select-none
                      active:scale-95 active:brightness-90
                      ${layout === "alphanumeric" ? "flex-1 max-w-[52px] text-sm" : "w-20 text-lg"}
                      ${
                        isBackspace
                          ? "bg-navy-700 text-amber-400 hover:bg-navy-600 border border-navy-600"
                          : isColon
                            ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xl font-bold"
                            : "bg-navy-800 text-white hover:bg-navy-700 border border-navy-600"
                      }
                    `}
                    aria-label={isBackspace ? "Backspace" : key}
                  >
                    {isBackspace ? <Delete className="w-4 h-4" /> : key}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Action row */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                handleClear();
              }}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-navy-700 border border-navy-600 text-slate-300 hover:bg-navy-600 hover:text-white font-semibold text-sm transition-all active:scale-95"
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold text-sm transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              aria-label="Done"
            >
              <Check className="w-4 h-4" />
              Done
            </button>
          </div>
        </div>

        {/* Safe area spacer for mobile */}
        <div className="h-safe-bottom pb-2" />
      </div>
    </>
  );
}
