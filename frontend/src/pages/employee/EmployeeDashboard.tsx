import React from 'react';
import { Calendar, Clock, ClipboardList, ChevronRight } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '../../hooks/useAuth';
import { useGetShiftsForEmployee, useGetTimeOffRequestsForEmployee } from '../../hooks/useQueries';
import { ShiftStatus } from '../../backend';

function formatTime(minutes: bigint): string {
  const totalMins = Number(minutes);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDate(ts: bigint): string {
  return new Date(Number(ts)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function EmployeeDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const employeeId = session?.employeeId ?? '';

  const { data: allShifts = [], isLoading: shiftsLoading } = useGetShiftsForEmployee(employeeId);
  const { data: timeOffRequests = [], isLoading: timeOffLoading } = useGetTimeOffRequestsForEmployee(employeeId);

  // Only show published shifts
  const publishedShifts = allShifts.filter((s) => s.status === ShiftStatus.published);

  const now = Date.now();
  const upcomingShifts = publishedShifts
    .filter((s) => Number(s.date) >= now - 24 * 60 * 60 * 1000)
    .sort((a, b) => Number(a.date) - Number(b.date))
    .slice(0, 5);

  const pendingTimeOff = timeOffRequests.filter((r) => r.status === 'pending');

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {session?.username}!
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's your overview for today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Upcoming Shifts</p>
              <p className="text-white text-xl font-bold">
                {shiftsLoading ? '—' : upcomingShifts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Pending Time Off</p>
              <p className="text-white text-xl font-bold">
                {timeOffLoading ? '—' : pendingTimeOff.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <ClipboardList className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-slate-400 text-xs">Total Shifts</p>
              <p className="text-white text-xl font-bold">
                {shiftsLoading ? '—' : publishedShifts.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Shifts */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Upcoming Shifts
          </h2>
          <button
            onClick={() => navigate({ to: '/employee/schedule' })}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm transition-colors"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {shiftsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : upcomingShifts.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No upcoming published shifts.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-3 bg-slate-700/40 rounded-lg border border-slate-600/30"
              >
                <div>
                  <p className="text-white text-sm font-medium">{formatDate(shift.date)}</p>
                  <p className="text-slate-400 text-xs">{shift.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 text-sm font-medium">
                    {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate({ to: '/employee/schedule' })}
            className="flex items-center gap-3 p-3 bg-slate-700/40 hover:bg-slate-700/70 border border-slate-600/30 rounded-lg transition-colors text-left"
          >
            <Calendar className="w-5 h-5 text-amber-400" />
            <span className="text-slate-300 text-sm font-medium">View Schedule</span>
          </button>
          <button
            onClick={() => navigate({ to: '/employee/timesheet' })}
            className="flex items-center gap-3 p-3 bg-slate-700/40 hover:bg-slate-700/70 border border-slate-600/30 rounded-lg transition-colors text-left"
          >
            <ClipboardList className="w-5 h-5 text-green-400" />
            <span className="text-slate-300 text-sm font-medium">Submit Timesheet</span>
          </button>
          <button
            onClick={() => navigate({ to: '/employee/time-off' })}
            className="flex items-center gap-3 p-3 bg-slate-700/40 hover:bg-slate-700/70 border border-slate-600/30 rounded-lg transition-colors text-left"
          >
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-slate-300 text-sm font-medium">Request Time Off</span>
          </button>
        </div>
      </div>
    </div>
  );
}
