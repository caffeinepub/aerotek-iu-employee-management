import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTimesheets, useSubmitTimesheet } from '../../hooks/useQueries';
import { Timesheet, TimesheetEntry, TimesheetStatus } from '../../backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Clock, Send } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (endMins <= startMins) return 0;
  return Math.round(((endMins - startMins) / 60) * 100) / 100;
}

function getStatusBadge(status: TimesheetStatus) {
  switch (status) {
    case TimesheetStatus.submitted:
      return <Badge variant="secondary">Submitted</Badge>;
    case TimesheetStatus.managerApproved:
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Manager Approved</Badge>;
    case TimesheetStatus.managerDenied:
      return <Badge variant="destructive">Manager Denied</Badge>;
    case TimesheetStatus.hrApproved:
      return <Badge className="bg-green-100 text-green-800 border-green-200">HR Approved</Badge>;
    case TimesheetStatus.hrDenied:
      return <Badge variant="destructive">HR Denied</Badge>;
    default:
      return <Badge variant="outline">{String(status)}</Badge>;
  }
}

export default function EmployeeTimesheetPage() {
  const { session } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState<Record<string, { start: string; end: string }>>({});

  const weekStart = getWeekStart(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(weekStart);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const { data: timesheets, isLoading } = useTimesheets();
  const submitMutation = useSubmitTimesheet();

  const existingTimesheet = timesheets?.find(
    (ts) => ts.weekStartDate === weekStartStr && ts.employeeUsername === session?.username
  );

  const handleEntryChange = (dateStr: string, field: 'start' | 'end', value: string) => {
    setEntries((prev) => ({
      ...prev,
      [dateStr]: { ...prev[dateStr], [field]: value },
    }));
  };

  const totalHours = weekDates.reduce((sum, date) => {
    const dateStr = date.toISOString().split('T')[0];
    const entry = entries[dateStr];
    if (!entry) return sum;
    return sum + calcHours(entry.start || '', entry.end || '');
  }, 0);

  const handleSubmit = async () => {
    if (!session?.username) {
      toast.error('No session found. Please log in again.');
      return;
    }

    const timesheetEntries: TimesheetEntry[] = weekDates
      .map((date) => {
        const dateStr = date.toISOString().split('T')[0];
        const entry = entries[dateStr];
        if (!entry || (!entry.start && !entry.end)) return null;
        return {
          date: dateStr,
          startTime: entry.start || '',
          endTime: entry.end || '',
          hoursWorked: calcHours(entry.start || '', entry.end || ''),
        };
      })
      .filter((e): e is TimesheetEntry => e !== null);

    if (timesheetEntries.length === 0) {
      toast.error('Please enter at least one time entry before submitting.');
      return;
    }

    const timesheet: Timesheet = {
      id: `ts-${session.username}-${weekStartStr}-${Date.now()}`,
      employeeId: session.employeeId || session.username,
      employeeUsername: session.username,
      entries: timesheetEntries,
      totalHours,
      status: TimesheetStatus.submitted,
      submittedAt: BigInt(Date.now()) * BigInt(1_000_000),
      weekStartDate: weekStartStr,
    };

    try {
      await submitMutation.mutateAsync(timesheet);
      toast.success('Timesheet submitted successfully!');
      setEntries({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit timesheet');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Timesheet</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your weekly hours</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {formatWeekLabel(weekStart)}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {existingTimesheet ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Timesheet Already Submitted</CardTitle>
              {getStatusBadge(existingTimesheet.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingTimesheet.entries.map((entry) => (
                <div key={entry.date} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">{entry.date}</span>
                  <span className="text-sm text-muted-foreground">
                    {entry.startTime} – {entry.endTime}
                  </span>
                  <span className="text-sm font-medium">{entry.hoursWorked}h</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-semibold">
                <span>Total Hours</span>
                <span>{existingTimesheet.totalHours}h</span>
              </div>
            </div>
            {existingTimesheet.managerComment && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Manager Comment</p>
                <p className="text-sm">{existingTimesheet.managerComment}</p>
              </div>
            )}
            {existingTimesheet.hrComment && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">HR Comment</p>
                <p className="text-sm">{existingTimesheet.hrComment}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Enter Your Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weekDates.map((date, idx) => {
                const dateStr = date.toISOString().split('T')[0];
                const entry = entries[dateStr] || { start: '', end: '' };
                const hours = calcHours(entry.start, entry.end);
                const isWeekend = idx >= 5;
                return (
                  <div
                    key={dateStr}
                    className={`grid grid-cols-4 gap-3 items-center py-2 ${isWeekend ? 'opacity-60' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{DAYS[idx]}</p>
                      <p className="text-xs text-muted-foreground">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Start</Label>
                      <Input
                        type="time"
                        value={entry.start}
                        onChange={(e) => handleEntryChange(dateStr, 'start', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">End</Label>
                      <Input
                        type="time"
                        value={entry.end}
                        onChange={(e) => handleEntryChange(dateStr, 'end', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Hours</p>
                      <p className="text-sm font-semibold">{hours > 0 ? `${hours}h` : '—'}</p>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-semibold">Total Hours</span>
                <span className="font-bold text-lg">{totalHours}h</span>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || totalHours === 0}
                className="gap-2"
              >
                {submitMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Timesheet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Timesheets */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Previous Timesheets</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {(timesheets || [])
              .filter((ts) => ts.employeeUsername === session?.username && ts.weekStartDate !== weekStartStr)
              .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
              .map((ts) => (
                <Card key={ts.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Week of {ts.weekStartDate}</p>
                        <p className="text-xs text-muted-foreground">{ts.totalHours}h total</p>
                      </div>
                      {getStatusBadge(ts.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            {(timesheets || []).filter((ts) => ts.employeeUsername === session?.username).length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-8">No timesheets submitted yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
