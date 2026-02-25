import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from '../../hooks/useActor';
import { Timesheet, TimesheetEntry, TimesheetStatus } from '../../backend';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Clock, Building2, AlertCircle, CheckCircle2, XCircle, Loader2, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  return d.toISOString().split('T')[0];
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayEntry {
  startTime: string;
  endTime: string;
  buildingNumber: string;
}

function calcPaidHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return 0;
  // 30-min unpaid break for shifts >= 8h30m
  if (mins >= 510) mins -= 30;
  return Math.round((mins / 60) * 100) / 100;
}

function statusLabel(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted: return 'Pending Manager Review';
    case TimesheetStatus.managerApproved: return 'Manager Approved';
    case TimesheetStatus.managerDenied: return 'Manager Denied';
    case TimesheetStatus.hrApproved: return 'HR Approved';
    case TimesheetStatus.hrDenied: return 'HR Denied';
    default: return String(status);
  }
}

function statusVariant(status: TimesheetStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case TimesheetStatus.submitted: return 'secondary';
    case TimesheetStatus.managerApproved: return 'default';
    case TimesheetStatus.managerDenied: return 'destructive';
    case TimesheetStatus.hrApproved: return 'default';
    case TimesheetStatus.hrDenied: return 'destructive';
    default: return 'outline';
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function EmployeeTimesheetPage() {
  const { session } = useAuthContext();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  const [weekStart, setWeekStart] = useState<Date>(() => getSunday(new Date()));
  const [entries, setEntries] = useState<Record<string, DayEntry>>({});

  // Derive employeeId from session
  const employeeId = session?.employeeId ?? null;
  const employeeUsername = session?.username ?? '';

  // Build the 7 day dates for the current week
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekStartKey = formatDateKey(weekStart);

  // ── queries ──
  const { data: timesheets = [], isLoading: tsLoading } = useQuery<Timesheet[]>({
    queryKey: ['timesheets'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTimesheets();
    },
    enabled: !!actor && !actorFetching,
  });

  // ── mutations ──
  const submitMutation = useMutation({
    mutationFn: async (timesheet: Timesheet) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.submitTimesheet(timesheet);
      if (result.__kind__ === 'err') throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      toast.success('Timesheet submitted successfully!');
      setEntries({});
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to submit timesheet');
    },
  });

  // ── handlers ──
  function updateEntry(dateKey: string, field: keyof DayEntry, value: string) {
    setEntries(prev => ({
      ...prev,
      [dateKey]: { ...{ startTime: '', endTime: '', buildingNumber: '' }, ...prev[dateKey], [field]: value },
    }));
  }

  function handlePrevWeek() {
    setWeekStart(prev => addDays(prev, -7));
    setEntries({});
  }

  function handleNextWeek() {
    setWeekStart(prev => addDays(prev, 7));
    setEntries({});
  }

  function handleSubmit() {
    if (!employeeId) {
      toast.error('Your account is not linked to an employee profile. Please contact HR.');
      return;
    }

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

    if (filledEntries.length === 0) {
      toast.error('Please enter at least one day of hours before submitting.');
      return;
    }

    const totalHours = filledEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const id = `ts-${employeeId}-${weekStartKey}-${Date.now()}`;

    const timesheet: Timesheet = {
      id,
      employeeId,
      employeeUsername,
      entries: filledEntries,
      totalHours: Math.round(totalHours * 100) / 100,
      status: TimesheetStatus.submitted,
      submittedAt: BigInt(Date.now()) * BigInt(1_000_000),
      weekStartDate: weekStartKey,
      managerComment: undefined,
      hrComment: undefined,
    };

    submitMutation.mutate(timesheet);
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
    return weekDays.some(day => {
      const key = formatDateKey(day);
      const entry = entries[key];
      if (!entry?.startTime || !entry?.endTime) return false;
      const [sh, sm] = entry.startTime.split(':').map(Number);
      const [eh, em] = entry.endTime.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      return mins >= 510;
    });
  }, [entries, weekDays]);

  const myTimesheets = useMemo(() => {
    return timesheets
      .filter(ts => ts.employeeUsername === employeeUsername || ts.employeeId === employeeId)
      .sort((a, b) => Number(b.submittedAt) - Number(a.submittedAt));
  }, [timesheets, employeeUsername, employeeId]);

  const today = formatDateKey(new Date());

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
              Log your hours for the week. A 30-minute unpaid break is automatically deducted for shifts of 8.5 hours or more.
            </p>
          </div>
        </div>

        {/* ── No employee ID warning ── */}
        {!employeeId && (
          <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Account not linked to an employee profile</p>
              <p className="text-sm text-amber-400/80 mt-0.5">Please contact HR to link your account before submitting timesheets.</p>
            </div>
          </div>
        )}

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
              <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Week of</p>
              <p className="text-lg font-bold text-white">{formatWeekRange(weekStart)}</p>
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
              const entry = entries[key] ?? { startTime: '', endTime: '', buildingNumber: '' };
              const paidHours = calcPaidHours(entry.startTime, entry.endTime);
              const isToday = key === today;
              const hasBreak = entry.startTime && entry.endTime && (() => {
                const [sh, sm] = entry.startTime.split(':').map(Number);
                const [eh, em] = entry.endTime.split(':').map(Number);
                return (eh * 60 + em) - (sh * 60 + sm) >= 510;
              })();
              const hasHours = paidHours > 0;

              return (
                <div
                  key={key}
                  className={`p-4 flex flex-col gap-3 transition-colors ${
                    isToday
                      ? 'bg-amber-500/10 border-t-2 border-t-amber-400 lg:border-t-0 lg:border-l-2 lg:border-l-amber-400'
                      : 'bg-navy-900 hover:bg-navy-800/50'
                  }`}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-0.5">
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest ${isToday ? 'text-amber-400' : 'text-slate-400'}`}>
                        {DAY_NAMES[i]}
                      </p>
                      <p className={`text-xl font-bold leading-none ${isToday ? 'text-amber-300' : 'text-white'}`}>
                        {day.getDate()}
                      </p>
                      <p className="text-xs text-slate-500">{formatDisplayDate(day)}</p>
                    </div>
                    {hasHours && (
                      <div className={`lg:mt-1 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        hasBreak ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        <Clock className="w-3 h-3" />
                        {paidHours.toFixed(2)}h
                        {hasBreak && <span className="text-amber-400">*</span>}
                      </div>
                    )}
                  </div>

                  {/* Inputs */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-400 font-medium block mb-1">Start</label>
                      <input
                        type="time"
                        value={entry.startTime}
                        onChange={e => updateEntry(key, 'startTime', e.target.value)}
                        className="w-full bg-navy-800 border border-navy-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-medium block mb-1">End</label>
                      <input
                        type="time"
                        value={entry.endTime}
                        onChange={e => updateEntry(key, 'endTime', e.target.value)}
                        className="w-full bg-navy-800 border border-navy-600 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      {/* Fixed: removed conflicting 'block' + 'flex' — use only 'flex' */}
                      <label className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
                        <Building2 className="w-3 h-3" /> Bldg #
                      </label>
                      <input
                        type="text"
                        value={entry.buildingNumber}
                        onChange={e => updateEntry(key, 'buildingNumber', e.target.value)}
                        placeholder="—"
                        className="w-full bg-navy-800 border border-navy-600 rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary bar */}
          <div className="px-6 py-4 border-t border-navy-700 bg-navy-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Total Paid Hours</p>
                <p className="text-2xl font-bold text-white">{totalPaidHours.toFixed(2)}<span className="text-sm text-slate-400 ml-1">hrs</span></p>
              </div>
              {hasBreakDeduction && (
                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>* 30-min unpaid break deducted for shifts ≥ 8.5 hrs</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || !employeeId || totalPaidHours === 0}
              className="bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold px-8 py-3 rounded-xl text-base shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </span>
              ) : (
                'Submit Timesheet'
              )}
            </Button>
          </div>
        </div>

        {/* ── Submitted Timesheets History ── */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Submission History
          </h2>

          {tsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-20 bg-navy-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : myTimesheets.length === 0 ? (
            <div className="bg-navy-900 border border-navy-700 rounded-xl p-8 text-center text-slate-500">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No timesheets submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myTimesheets.map(ts => (
                <div
                  key={ts.id}
                  className="bg-navy-900 border border-navy-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-navy-600 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-navy-800 border border-navy-600 flex items-center justify-center shrink-0">
                      {ts.status === TimesheetStatus.hrApproved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : ts.status === TimesheetStatus.managerDenied || ts.status === TimesheetStatus.hrDenied ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">
                        Week of {ts.weekStartDate}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ts.totalHours.toFixed(2)} paid hours · {ts.entries.length} day{ts.entries.length !== 1 ? 's' : ''} logged
                      </p>
                      {(ts.managerComment || ts.hrComment) && (
                        <p className="text-xs text-slate-500 mt-1 italic">
                          "{ts.managerComment || ts.hrComment}"
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <Badge variant={statusVariant(ts.status)} className="text-xs whitespace-nowrap">
                      {statusLabel(ts.status)}
                    </Badge>
                    <p className="text-xs text-slate-500">
                      {new Date(Number(ts.submittedAt) / 1_000_000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
