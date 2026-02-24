import React, { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, ChevronLeft, ChevronRight, Send, Clock } from 'lucide-react';
import { useTimesheets, useSubmitTimesheet } from '../../hooks/useQueries';
import { useAuth } from '../../hooks/useAuth';
import { TimesheetStatus } from '../../backend';
import type { Timesheet, TimesheetEntry } from '../../backend';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins <= startMins) return 0;
  return Math.round(((endMins - startMins) / 60) * 100) / 100;
}

function generateId(): string {
  return `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getStatusLabel(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted:
      return 'Pending Manager Review';
    case TimesheetStatus.managerApproved:
      return 'Pending HR Review';
    case TimesheetStatus.managerDenied:
      return 'Denied by Manager';
    case TimesheetStatus.hrApproved:
      return 'Approved';
    case TimesheetStatus.hrDenied:
      return 'Denied by HR';
    default:
      return 'Unknown';
  }
}

function getStatusColor(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted:
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    case TimesheetStatus.managerApproved:
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    case TimesheetStatus.managerDenied:
      return 'bg-red-500/20 text-red-300 border border-red-500/30';
    case TimesheetStatus.hrApproved:
      return 'bg-green-500/20 text-green-300 border border-green-500/30';
    case TimesheetStatus.hrDenied:
      return 'bg-red-500/20 text-red-300 border border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
  }
}

interface DayEntry {
  date: Date;
  startTime: string;
  endTime: string;
}

export default function EmployeeTimesheetPage() {
  const { session } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<DayEntry[]>([]);

  const weekStart = getWeekStart(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);

  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Initialize entries when week changes
  React.useEffect(() => {
    setEntries(
      days.map((date) => ({
        date,
        startTime: '',
        endTime: '',
      }))
    );
  }, [weekOffset]);

  const { data: timesheets = [], isLoading } = useTimesheets();
  const submitMutation = useSubmitTimesheet();

  const updateEntry = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const totalHours = entries.reduce((sum, e) => sum + calcHours(e.startTime, e.endTime), 0);

  const handleSubmit = async () => {
    const filledEntries = entries.filter((e) => e.startTime || e.endTime);
    for (const e of filledEntries) {
      if (!e.startTime || !e.endTime) {
        toast.error('Please fill in both start and end times for all active rows.');
        return;
      }
    }
    if (filledEntries.length === 0) {
      toast.error('Please enter at least one day of work.');
      return;
    }

    const timesheetEntries: TimesheetEntry[] = filledEntries.map((e) => ({
      date: formatDateKey(e.date),
      startTime: e.startTime,
      endTime: e.endTime,
      hoursWorked: calcHours(e.startTime, e.endTime),
    }));

    const timesheet: Timesheet = {
      id: generateId(),
      employeeId: session?.employeeId ?? '',
      employeeUsername: session?.username ?? '',
      entries: timesheetEntries,
      totalHours: filledEntries.reduce((sum, e) => sum + calcHours(e.startTime, e.endTime), 0),
      status: TimesheetStatus.submitted,
      submittedAt: BigInt(Date.now()) * 1_000_000n,
      weekStartDate: formatDateKey(weekStart),
      managerComment: undefined,
      hrComment: undefined,
    };

    try {
      await submitMutation.mutateAsync(timesheet);
      toast.success('Timesheet submitted successfully!');
      setEntries(days.map((date) => ({ date, startTime: '', endTime: '' })));
    } catch (err) {
      toast.error(`Failed to submit: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const myTimesheets = timesheets.filter(
    (ts) => ts.employeeUsername === session?.username
  );

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <ClipboardList className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">My Timesheet</h1>
          <p className="text-slate-400 text-sm">Enter your hours and submit for approval</p>
        </div>
      </div>

      {/* Week Entry Form */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-white font-semibold">
              Week of {formatDateLabel(weekStart)}
            </p>
            <p className="text-slate-400 text-sm">
              {formatDateLabel(weekStart)} – {formatDateLabel(days[6])}
            </p>
          </div>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Time Entry Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Day</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Start Time</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">End Time</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Hours</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const hours = calcHours(entry.startTime, entry.endTime);
                const isToday = formatDateKey(entry.date) === formatDateKey(new Date());
                return (
                  <tr
                    key={i}
                    className={`border-b border-slate-700/50 ${isToday ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium ${isToday ? 'text-amber-400' : 'text-slate-300'}`}>
                        {formatDayLabel(entry.date)}
                        {isToday && <span className="ml-2 text-xs text-amber-500">(Today)</span>}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => updateEntry(i, 'startTime', e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => updateEntry(i, 'endTime', e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-semibold ${hours > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {hours > 0 ? `${hours}h` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600">
                <td colSpan={3} className="py-3 px-4 text-slate-300 font-semibold text-sm">
                  Total Hours
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-amber-400 font-bold text-lg">{totalHours.toFixed(2)}h</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || totalHours === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors"
          >
            {submitMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Timesheet
              </>
            )}
          </button>
        </div>
      </div>

      {/* Previous Timesheets */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          Submitted Timesheets
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : myTimesheets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No timesheets submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTimesheets
              .slice()
              .sort((a, b) => (a.weekStartDate > b.weekStartDate ? -1 : 1))
              .map((ts) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between p-4 bg-slate-700/40 rounded-lg border border-slate-600/30"
                >
                  <div>
                    <p className="text-white font-medium text-sm">
                      Week of {ts.weekStartDate}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {ts.totalHours.toFixed(2)} hours total
                    </p>
                    {ts.managerComment && (
                      <p className="text-slate-400 text-xs mt-1">
                        Manager: {ts.managerComment}
                      </p>
                    )}
                    {ts.hrComment && (
                      <p className="text-slate-400 text-xs mt-0.5">
                        HR: {ts.hrComment}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ts.status)}`}>
                    {getStatusLabel(ts.status)}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
