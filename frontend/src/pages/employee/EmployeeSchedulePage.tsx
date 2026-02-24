import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Moon, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGetShiftsForEmployee } from '../../hooks/useQueries';
import { ShiftStatus } from '../../backend';

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

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(minutes: bigint): string {
  const totalMins = Number(minutes);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function isOvernightShift(startTime: bigint, endTime: bigint): boolean {
  return endTime <= startTime;
}

export default function EmployeeSchedulePage() {
  const { session } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);

  const employeeId = session?.employeeId ?? '';

  const { data: allShifts = [], isLoading } = useGetShiftsForEmployee(employeeId);

  // Only show published shifts
  const shifts = allShifts.filter((s) => s.status === ShiftStatus.published);

  const weekStart = getWeekStart(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);

  const days: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getShiftsForDay = (date: Date) => {
    const dayStart = date.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return shifts.filter((s) => {
      const shiftDate = Number(s.date);
      return shiftDate >= dayStart && shiftDate < dayEnd;
    });
  };

  const weekShifts = days.flatMap((d) => getShiftsForDay(d));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Calendar className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">My Schedule</h1>
          <p className="text-slate-400 text-sm">View your published shifts</p>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-white font-semibold">
              {formatDateLabel(weekStart)} – {formatDateLabel(days[6])}
            </p>
            <p className="text-slate-400 text-sm">
              {weekShifts.length} shift{weekShifts.length !== 1 ? 's' : ''} this week
            </p>
          </div>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {days.map((day, i) => {
            const dayShifts = getShiftsForDay(day);
            const isToday =
              day.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`bg-slate-800/60 border rounded-xl p-3 min-h-[120px] ${
                  isToday
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-slate-700/50'
                }`}
              >
                <p
                  className={`text-xs font-semibold mb-2 ${
                    isToday ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {formatDayHeader(day)}
                  {isToday && (
                    <span className="ml-1 text-amber-500">(Today)</span>
                  )}
                </p>
                {dayShifts.length === 0 ? (
                  <p className="text-slate-600 text-xs">No shifts</p>
                ) : (
                  <div className="space-y-2">
                    {dayShifts.map((shift) => {
                      const overnight = isOvernightShift(shift.startTime, shift.endTime);
                      return (
                        <div
                          key={shift.id}
                          className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-2"
                        >
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400 flex-shrink-0" />
                            <span className="text-amber-300 text-xs font-medium">
                              {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                            </span>
                            {overnight && (
                              <Moon className="w-3 h-3 text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5">{shift.department}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No shifts message */}
      {!isLoading && weekShifts.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No published shifts this week</p>
          <p className="text-sm mt-1">Check back after your manager publishes the schedule.</p>
        </div>
      )}
    </div>
  );
}
