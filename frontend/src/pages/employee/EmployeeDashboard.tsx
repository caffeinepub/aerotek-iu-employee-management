import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthContext } from '../../contexts/AuthContext';
import { useGetMyShifts, useGetTimeOffRequestsForEmployee } from '../../hooks/useQueries';
import { ShiftStatus } from '../../backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  Clock,
  FileText,
  ClipboardList,
  Moon,
  ChevronRight,
} from 'lucide-react';

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function isOvernightShift(startTime: bigint, endTime: bigint): boolean {
  return Number(endTime) <= Number(startTime);
}

export default function EmployeeDashboard() {
  const { session } = useAuthContext();
  const navigate = useNavigate();

  // Use role-aware getShifts() — no employeeId needed
  const { data: allShifts = [], isLoading: shiftsLoading } = useGetMyShifts();

  const { data: timeOffRequests = [], isLoading: timeOffLoading } =
    useGetTimeOffRequestsForEmployee(session?.employeeId ?? '');

  const now = BigInt(Date.now()) * 1_000_000n;
  const oneWeekFromNow = now + BigInt(7 * 24 * 60 * 60 * 1_000_000_000);

  // Only published shifts, upcoming within the next 7 days
  // If we have an employeeId, filter to just this employee's shifts
  const publishedShifts = allShifts.filter(
    (s) => s.status === ShiftStatus.published
  );

  const myUpcomingShifts = (
    session?.employeeId
      ? publishedShifts.filter((s) => s.employeeId === session.employeeId)
      : publishedShifts
  )
    .filter((s) => s.date >= now && s.date <= oneWeekFromNow)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 5);

  const pendingTimeOff = timeOffRequests.filter((r) => r.status === 'pending' as unknown);

  const formatShiftDate = (dateNs: bigint) => {
    const ms = Number(dateNs) / 1_000_000;
    return new Date(ms).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {session?.username ?? 'Employee'}!
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's your overview for today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-4"
          onClick={() => navigate({ to: '/employee/schedule' })}
        >
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">My Schedule</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-4"
          onClick={() => navigate({ to: '/employee/time-off' })}
        >
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Time Off</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-4"
          onClick={() => navigate({ to: '/employee/timesheet' })}
        >
          <ClipboardList className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">Timesheet</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 py-4"
          onClick={() => navigate({ to: '/employee/schedule' })}
        >
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium">View Hours</span>
        </Button>
      </div>

      {/* Upcoming Shifts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Upcoming Shifts</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate({ to: '/employee/schedule' })}
          >
            View all <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : myUpcomingShifts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No upcoming published shifts this week.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Check back after your manager publishes the schedule.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {myUpcomingShifts.map((shift) => {
                const overnight = isOvernightShift(shift.startTime, shift.endTime);
                return (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 rounded-md p-2">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {formatShiftDate(shift.date)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {shift.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground flex items-center gap-1">
                          {formatTime(Number(shift.startTime))} –{' '}
                          {formatTime(Number(shift.endTime))}
                          {overnight && (
                            <Moon className="h-3 w-3 text-primary" />
                          )}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          Published
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Off Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Time Off Requests</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate({ to: '/employee/time-off' })}
          >
            View all <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {timeOffLoading ? (
            <Skeleton className="h-16 rounded-lg" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {timeOffRequests.length}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">
                  {pendingTimeOff.length}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">
                  {timeOffRequests.filter((r) => r.status === 'approved' as unknown).length}
                </p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
