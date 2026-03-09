import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Keyboard,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react";
import React, { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  type Timesheet,
  type TimesheetEntry,
  TimesheetStatus,
} from "../../backend";
import BadgeConfirmationModal from "../../components/BadgeConfirmationModal";
import OnScreenKeyboard, {
  type KeyboardLayout,
} from "../../components/OnScreenKeyboard";
import { useAuthContext } from "../../contexts/AuthContext";
import { useActor } from "../../hooks/useActor";
import { useLoginWithBadgeId } from "../../hooks/useQueries";

// ── helpers ──────────────────────────────────────────────────────────────────

function getSunday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function formatDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DayEntry {
  startTime: string;
  endTime: string;
  buildingNumber: string;
}

type ActiveField = {
  dateKey: string;
  field: keyof DayEntry;
  layout: KeyboardLayout;
  label: string;
} | null;

/**
 * Calculate paid hours for a shift, supporting overnight shifts.
 * If endTime <= startTime, the shift crosses midnight (add 24h to end).
 * A 30-minute unpaid break is deducted for shifts >= 8h30m (510 minutes).
 */
function calcPaidHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  // Overnight shift: end time is at or before start time → crosses midnight
  if (endMins <= startMins) {
    endMins += 24 * 60;
  }
  let mins = endMins - startMins;
  if (mins <= 0) return 0;
  // 30-min unpaid break for shifts >= 8h30m (510 minutes)
  if (mins >= 510) mins -= 30;
  return Math.round((mins / 60) * 100) / 100;
}

/**
 * Returns true if a shift qualifies for the break deduction (>= 510 raw minutes),
 * accounting for overnight shifts.
 */
function shiftHasBreak(start: string, end: string): boolean {
  if (!start || !end) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) {
    endMins += 24 * 60;
  }
  return endMins - startMins >= 510;
}

function statusLabel(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted:
      return "Pending Manager Review";
    case TimesheetStatus.managerApproved:
      return "Manager Approved";
    case TimesheetStatus.managerDenied:
      return "Manager Denied";
    case TimesheetStatus.hrApproved:
      return "HR Approved";
    case TimesheetStatus.hrDenied:
      return "HR Denied";
    default:
      return String(status);
  }
}

function statusVariant(
  status: TimesheetStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case TimesheetStatus.submitted:
      return "secondary";
    case TimesheetStatus.managerApproved:
      return "default";
    case TimesheetStatus.managerDenied:
      return "destructive";
    case TimesheetStatus.hrApproved:
      return "default";
    case TimesheetStatus.hrDenied:
      return "destructive";
    default:
      return "outline";
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function EmployeeTimesheetPage() {
  const { session } = useAuthContext();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState<Date>(() => getSunday(new Date()));
  const [entries, setEntries] = useState<Record<string, DayEntry>>({});
  const [activeField, setActiveField] = useState<ActiveField>(null);

  // Badge confirmation modal state
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [badgeError, setBadgeError] = useState<string | null>(null);
  // Pending timesheet to submit after badge verification
  const [pendingTimesheet, setPendingTimesheet] = useState<Timesheet | null>(
    null,
  );

  const employeeUsername = session?.username ?? "";

  // Build the 7 day dates for the current week
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekStartKey = formatDateKey(weekStart);

  // ── queries ──
  const { data: timesheets = [], isLoading: tsLoading } = useQuery<Timesheet[]>(
    {
      queryKey: ["timesheets"],
      queryFn: async () => {
        if (!actor) return [];
        return actor.getTimesheets();
      },
      enabled: !!actor && !actorFetching,
    },
  );

  // Fetch all employees (kept for potential future lookups)
  const { data: _allEmployees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployees();
    },
    enabled: !!actor && !actorFetching,
  });

  // Resolve employeeId: first from session (badge login sets this), otherwise null
  const resolvedEmployeeId = useMemo(() => {
    if (session?.employeeId) return session.employeeId;
    return null;
  }, [session?.employeeId]);

  // ── badge login mutation ──
  const loginWithBadgeId = useLoginWithBadgeId();

  // ── submit mutation ──
  const submitMutation = useMutation({
    mutationFn: async (timesheet: Timesheet) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.submitTimesheet(timesheet);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      const wasResubmission = myTimesheets.some(
        (ts) => ts.weekStartDate === weekStartKey,
      );
      toast.success(
        wasResubmission
          ? "Timesheet updated successfully!"
          : "Timesheet submitted successfully!",
      );
      setEntries({});
      setBadgeModalOpen(false);
      setPendingTimesheet(null);
      setBadgeError(null);
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit timesheet");
      setBadgeModalOpen(false);
      setPendingTimesheet(null);
    },
  });

  // ── handlers ──
  const updateEntry = useCallback(
    (dateKey: string, field: keyof DayEntry, value: string) => {
      setEntries((prev) => ({
        ...prev,
        [dateKey]: {
          ...{ startTime: "", endTime: "", buildingNumber: "" },
          ...prev[dateKey],
          [field]: value,
        },
      }));
    },
    [],
  );

  function openKeyboard(
    dateKey: string,
    field: keyof DayEntry,
    layout: KeyboardLayout,
    label: string,
  ) {
    setActiveField({ dateKey, field, layout, label });
  }

  function closeKeyboard() {
    setActiveField(null);
  }

  function handleKeyboardChange(value: string) {
    if (!activeField) return;
    updateEntry(activeField.dateKey, activeField.field, value);
  }

  function handlePrevWeek() {
    setWeekStart((prev) => addDays(prev, -7));
    setEntries({});
    setActiveField(null);
  }

  function handleNextWeek() {
    setWeekStart((prev) => addDays(prev, 7));
    setEntries({});
    setActiveField(null);
  }

  // Build the timesheet payload (without submitting yet)
  function buildTimesheetPayload(empId: string): Timesheet | null {
    const filledEntries: TimesheetEntry[] = weekDays
      .map((day) => {
        const key = formatDateKey(day);
        const entry = entries[key];
        if (!entry?.startTime || !entry?.endTime) return null;
        const hours = calcPaidHours(entry.startTime, entry.endTime);
        return {
          date: key,
          startTime: entry.startTime,
          endTime: entry.endTime,
          hoursWorked: hours,
          buildingNumber: entry.buildingNumber || undefined,
        } as TimesheetEntry;
      })
      .filter((e): e is TimesheetEntry => e !== null);

    if (filledEntries.length === 0) return null;

    const totalHours = filledEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const id = `ts-${empId}-${weekStartKey}-${Date.now()}`;

    return {
      id,
      employeeId: empId,
      employeeUsername,
      entries: filledEntries,
      totalHours: Math.round(totalHours * 100) / 100,
      status: TimesheetStatus.submitted,
      submittedAt: BigInt(Date.now()) * BigInt(1_000_000),
      weekStartDate: weekStartKey,
      managerComment: undefined,
      hrComment: undefined,
    };
  }

  // Called when user clicks "Submit Timesheet" button
  function handleSubmitClick() {
    const filledCount = weekDays.filter((day) => {
      const key = formatDateKey(day);
      const entry = entries[key];
      return entry?.startTime && entry?.endTime;
    }).length;

    if (filledCount === 0) {
      toast.error("Please enter at least one day of hours before submitting.");
      return;
    }

    // Open badge confirmation modal
    setBadgeError(null);
    setBadgeModalOpen(true);
  }

  // Called when user confirms badge in modal — must match (badgeId: string) => void signature
  function handleBadgeConfirm(badgeId: string) {
    setBadgeError(null);

    loginWithBadgeId
      .mutateAsync(badgeId)
      .then((profile) => {
        // Verify the badge belongs to the current session user
        if (profile.username !== employeeUsername) {
          setBadgeError("Badge number not recognized. Please try again.");
          return;
        }

        // Resolve employeeId from the verified profile
        const empId = profile.employeeId ?? resolvedEmployeeId;

        if (!empId) {
          setBadgeError(
            "Your account is not linked to an employee profile. Please contact HR.",
          );
          return;
        }

        // Build and submit the timesheet
        const timesheet = buildTimesheetPayload(empId);
        if (!timesheet) {
          setBadgeError(
            "Please enter at least one day of hours before submitting.",
          );
          return;
        }

        setPendingTimesheet(timesheet);
        submitMutation.mutate(timesheet);
      })
      .catch(() => {
        setBadgeError("Badge number not recognized. Please try again.");
      });
  }

  function handleBadgeModalClose() {
    if (submitMutation.isPending || loginWithBadgeId.isPending) return;
    setBadgeModalOpen(false);
    setBadgeError(null);
    setPendingTimesheet(null);
  }

  // ── computed ──
  const totalPaidHours = useMemo(() => {
    return weekDays.reduce((sum, day) => {
      const key = formatDateKey(day);
      const entry = entries[key];
      if (!entry?.startTime || !entry?.endTime) return sum;
      return sum + calcPaidHours(entry.startTime, entry.endTime);
    }, 0);
  }, [entries, weekDays]);

  const hasBreakDeduction = useMemo(() => {
    return weekDays.some((day) => {
      const key = formatDateKey(day);
      const entry = entries[key];
      if (!entry?.startTime || !entry?.endTime) return false;
      return shiftHasBreak(entry.startTime, entry.endTime);
    });
  }, [entries, weekDays]);

  const myTimesheets = useMemo(() => {
    return timesheets
      .filter(
        (ts) =>
          ts.employeeUsername === employeeUsername ||
          ts.employeeId === session?.employeeId,
      )
      .sort((a, b) => Number(b.submittedAt) - Number(a.submittedAt));
  }, [timesheets, employeeUsername, session?.employeeId]);

  // Check if a timesheet already exists for the current week (resubmission detection)
  const isResubmission = useMemo(() => {
    return myTimesheets.some((ts) => ts.weekStartDate === weekStartKey);
  }, [myTimesheets, weekStartKey]);

  const today = formatDateKey(new Date());

  // Current keyboard value
  const keyboardValue = activeField
    ? (entries[activeField.dateKey]?.[activeField.field] ?? "")
    : "";

  const isSubmitting = submitMutation.isPending || loginWithBadgeId.isPending;

  // Check if there's at least one filled day entry to enable the submit button
  const hasAnyEntry = weekDays.some((day) => {
    const key = formatDateKey(day);
    const entry = entries[key];
    return entry?.startTime && entry?.endTime;
  });

  // Suppress unused variable warning for pendingTimesheet
  void pendingTimesheet;

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CalendarDays className="w-8 h-8 text-amber-400" />
              Weekly Timesheet
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Log your hours for the week. A 30-minute unpaid break is
              automatically deducted for shifts of 8.5 hours or more.
            </p>
          </div>
          {/* On-screen keyboard hint */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2">
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span>Tap any field for on-screen keyboard</span>
          </div>
        </div>

        {/* ── Calendar Card ── */}
        <div className="bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Week navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700 bg-navy-800/60">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevWeek}
              className="text-slate-300 hover:text-white hover:bg-navy-700"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">
                Week of
              </p>
              <p className="text-lg font-bold text-white">
                {formatWeekRange(weekStart)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextWeek}
              className="text-slate-300 hover:text-white hover:bg-navy-700"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Day cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-navy-700">
            {weekDays.map((day, i) => {
              const key = formatDateKey(day);
              const entry = entries[key] ?? {
                startTime: "",
                endTime: "",
                buildingNumber: "",
              };
              const paidHours = calcPaidHours(entry.startTime, entry.endTime);
              const isToday = key === today;
              const hasBreak = shiftHasBreak(entry.startTime, entry.endTime);
              const hasHours = paidHours > 0;

              const isStartActive =
                activeField?.dateKey === key &&
                activeField?.field === "startTime";
              const isEndActive =
                activeField?.dateKey === key &&
                activeField?.field === "endTime";
              const isBldgActive =
                activeField?.dateKey === key &&
                activeField?.field === "buildingNumber";

              const isOvernightShift =
                entry.startTime &&
                entry.endTime &&
                (() => {
                  const [sh, sm] = entry.startTime.split(":").map(Number);
                  const [eh, em] = entry.endTime.split(":").map(Number);
                  return eh * 60 + em <= sh * 60 + sm;
                })();

              return (
                <div
                  key={key}
                  className={`p-4 flex flex-col gap-3 transition-colors ${
                    isToday
                      ? "bg-amber-500/10 border-t-2 border-t-amber-400 lg:border-t-0 lg:border-l-2 lg:border-l-amber-400"
                      : "bg-navy-900 hover:bg-navy-800/50"
                  }`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-0.5">
                    <div>
                      <p
                        className={`text-xs font-bold uppercase tracking-widest ${isToday ? "text-amber-400" : "text-slate-400"}`}
                      >
                        {DAY_NAMES[i]}
                      </p>
                      <p
                        className={`text-xl font-bold leading-none ${isToday ? "text-amber-300" : "text-white"}`}
                      >
                        {day.getDate()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDisplayDate(day)}
                      </p>
                    </div>
                    {hasHours && (
                      <div
                        className={`lg:mt-1 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          hasBreak
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {paidHours.toFixed(2)}h
                        {hasBreak && <span className="text-amber-400">*</span>}
                      </div>
                    )}
                  </div>

                  {/* Inputs */}
                  <div className="space-y-2">
                    {/* Start Time */}
                    <div>
                      <label
                        htmlFor={`ts-start-${key}`}
                        className="text-xs text-slate-400 font-medium block mb-1"
                      >
                        Start
                      </label>
                      <div className="relative">
                        <input
                          id={`ts-start-${key}`}
                          type="time"
                          value={entry.startTime}
                          onChange={(e) =>
                            updateEntry(key, "startTime", e.target.value)
                          }
                          onFocus={() =>
                            openKeyboard(
                              key,
                              "startTime",
                              "time",
                              `${DAY_NAMES[i]} Start`,
                            )
                          }
                          className={`w-full bg-navy-800 border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none transition-colors ${
                            isStartActive
                              ? "border-amber-400 ring-2 ring-amber-400/40"
                              : "border-navy-600 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                          }`}
                        />
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            openKeyboard(
                              key,
                              "startTime",
                              "time",
                              `${DAY_NAMES[i]} Start`,
                            );
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-amber-400 transition-colors"
                          aria-label="Open keyboard for start time"
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* End Time */}
                    <div>
                      <label
                        htmlFor={`ts-end-${key}`}
                        className="text-xs text-slate-400 font-medium block mb-1"
                      >
                        End
                      </label>
                      <div className="relative">
                        <input
                          id={`ts-end-${key}`}
                          type="time"
                          value={entry.endTime}
                          onChange={(e) =>
                            updateEntry(key, "endTime", e.target.value)
                          }
                          onFocus={() =>
                            openKeyboard(
                              key,
                              "endTime",
                              "time",
                              `${DAY_NAMES[i]} End`,
                            )
                          }
                          className={`w-full bg-navy-800 border rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none transition-colors ${
                            isEndActive
                              ? "border-amber-400 ring-2 ring-amber-400/40"
                              : "border-navy-600 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                          }`}
                        />
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            openKeyboard(
                              key,
                              "endTime",
                              "time",
                              `${DAY_NAMES[i]} End`,
                            );
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-amber-400 transition-colors"
                          aria-label="Open keyboard for end time"
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Overnight shift indicator */}
                      {isOvernightShift && (
                        <p className="text-xs text-blue-400 mt-0.5 flex items-center gap-1">
                          <span>🌙</span> Overnight shift
                        </p>
                      )}
                    </div>

                    {/* Building Number */}
                    <div>
                      <label
                        htmlFor={`ts-building-${key}`}
                        className="text-xs text-slate-400 font-medium block mb-1"
                      >
                        <Building2 className="w-3 h-3 inline mr-1" />
                        Building #
                      </label>
                      <div className="relative">
                        <input
                          id={`ts-building-${key}`}
                          type="text"
                          value={entry.buildingNumber}
                          onChange={(e) =>
                            updateEntry(key, "buildingNumber", e.target.value)
                          }
                          onFocus={() =>
                            openKeyboard(
                              key,
                              "buildingNumber",
                              "alphanumeric",
                              `${DAY_NAMES[i]} Building`,
                            )
                          }
                          placeholder="Optional"
                          className={`w-full bg-navy-800 border rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors ${
                            isBldgActive
                              ? "border-amber-400 ring-2 ring-amber-400/40"
                              : "border-navy-600 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400"
                          }`}
                        />
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            openKeyboard(
                              key,
                              "buildingNumber",
                              "alphanumeric",
                              `${DAY_NAMES[i]} Building`,
                            );
                          }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-amber-400 transition-colors"
                          aria-label="Open keyboard for building number"
                        >
                          <Keyboard className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Footer: totals + submit ── */}
          <div className="px-6 py-5 border-t border-navy-700 bg-navy-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">
                  Total Paid Hours:
                </span>
                <span className="text-2xl font-bold text-amber-400">
                  {totalPaidHours.toFixed(2)}h
                </span>
              </div>
              {hasBreakDeduction && (
                <p className="text-xs text-amber-300/70">
                  * 30-min unpaid break deducted for shifts ≥ 8.5 hours
                </p>
              )}
              {/* Resubmission notice */}
              {isResubmission && (
                <div className="flex items-center gap-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5 mt-1">
                  <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    You are updating a previously submitted timesheet for this
                    week.
                  </span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSubmitClick}
              disabled={isSubmitting || !hasAnyEntry}
              className="bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold px-6 py-2.5 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : isResubmission ? (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Update Timesheet
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Timesheet
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Previously Submitted Timesheets ── */}
        {tsLoading ? (
          <div className="flex items-center gap-3 text-slate-400 py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading timesheets…</span>
          </div>
        ) : myTimesheets.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              Submitted Timesheets
            </h2>
            <div className="space-y-3">
              {myTimesheets.map((ts) => (
                <div
                  key={ts.id}
                  className="bg-navy-900 border border-navy-700 rounded-xl p-5 space-y-3"
                >
                  {/* Timesheet header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Week of {ts.weekStartDate}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Submitted{" "}
                        {new Date(
                          Number(ts.submittedAt) / 1_000_000,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-amber-400">
                        {ts.totalHours.toFixed(2)}h total
                      </span>
                      <Badge variant={statusVariant(ts.status)}>
                        {statusLabel(ts.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* Day entries */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {ts.entries.map((entry) => {
                      const isOvernight = (() => {
                        if (!entry.startTime || !entry.endTime) return false;
                        const [sh, sm] = entry.startTime.split(":").map(Number);
                        const [eh, em] = entry.endTime.split(":").map(Number);
                        return eh * 60 + em <= sh * 60 + sm;
                      })();
                      return (
                        <div
                          key={entry.date}
                          className="bg-navy-800 border border-navy-600 rounded-lg p-2.5 text-xs space-y-1"
                        >
                          <p className="font-semibold text-slate-300">
                            {new Date(
                              `${entry.date}T12:00:00`,
                            ).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-slate-400">
                            {entry.startTime} – {entry.endTime}
                            {isOvernight && (
                              <span className="ml-1 text-blue-400">🌙</span>
                            )}
                          </p>
                          <p className="text-amber-300 font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entry.hoursWorked.toFixed(2)}h
                          </p>
                          {entry.buildingNumber && (
                            <p className="text-slate-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {entry.buildingNumber}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Comments */}
                  {ts.managerComment && (
                    <div className="bg-navy-800/50 border border-navy-600 rounded-lg px-3 py-2 text-xs">
                      <span className="text-slate-400 font-medium">
                        Manager:{" "}
                      </span>
                      <span className="text-slate-300">
                        {ts.managerComment}
                      </span>
                    </div>
                  )}
                  {ts.hrComment && (
                    <div className="bg-navy-800/50 border border-navy-600 rounded-lg px-3 py-2 text-xs">
                      <span className="text-slate-400 font-medium">HR: </span>
                      <span className="text-slate-300">{ts.hrComment}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── On-Screen Keyboard ── */}
      {activeField && (
        <OnScreenKeyboard
          layout={activeField.layout}
          value={keyboardValue}
          onChange={handleKeyboardChange}
          onClose={closeKeyboard}
          label={activeField.label}
        />
      )}

      {/* ── Badge Confirmation Modal ── */}
      <BadgeConfirmationModal
        isOpen={badgeModalOpen}
        onClose={handleBadgeModalClose}
        onConfirm={handleBadgeConfirm}
        loading={isSubmitting}
        error={badgeError}
      />
    </div>
  );
}
