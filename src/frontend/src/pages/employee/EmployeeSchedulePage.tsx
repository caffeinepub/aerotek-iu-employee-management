import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronLeft, ChevronRight, Clock, Moon } from "lucide-react";
import React, { useState } from "react";
import { ShiftStatus } from "../../backend";
import { useAuthContext } from "../../contexts/AuthContext";
import { useGetMyShifts } from "../../hooks/useQueries";

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

// Returns the most recent Sunday for the given date (week starts on Sunday)
function getSunday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function isOvernightShift(startTime: bigint, endTime: bigint): boolean {
  return Number(endTime) <= Number(startTime);
}

export default function EmployeeSchedulePage() {
  const { session } = useAuthContext();
  const [weekStart, setWeekStart] = useState<Date>(getSunday(new Date()));

  // Use getShifts() via useGetMyShifts — role-aware, no employeeId needed
  const { data: allShifts = [], isLoading } = useGetMyShifts();

  const weekDays = getWeekDays(weekStart);
  const weekStartTs = BigInt(weekStart.getTime()) * 1_000_000n;
  const weekEndTs = weekStartTs + BigInt(7 * 24 * 60 * 60 * 1_000_000_000);

  // Filter: only published shifts for this week
  const publishedShifts = allShifts.filter(
    (s) =>
      s.status === ShiftStatus.published &&
      s.date >= weekStartTs &&
      s.date < weekEndTs,
  );

  // Further filter by employeeId if we have it (for employees who logged in via badge)
  const myShifts = session?.employeeId
    ? publishedShifts.filter((s) => s.employeeId === session.employeeId)
    : publishedShifts;

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const formatDayName = (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "short" });

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getShiftsForDay = (day: Date) => {
    const dayStart = BigInt(day.getTime()) * 1_000_000n;
    const dayEnd = dayStart + BigInt(24 * 60 * 60 * 1_000_000_000);
    return myShifts.filter((s) => s.date >= dayStart && s.date < dayEnd);
  };

  const weekLabel = `${formatDate(weekDays[0])} – ${formatDate(weekDays[6])}`;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Schedule</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your published shifts for the week
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {weekLabel}
          </span>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {/* No shifts message */}
      {!isLoading && myShifts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Published Shifts
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              No shifts have been published for this week yet. Check back later
              or contact your manager.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Weekly Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const today = isToday(day);

            return (
              <Card
                key={day.toISOString()}
                className={today ? "border-primary ring-1 ring-primary" : ""}
              >
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {formatDayName(day)}
                    </span>
                    {today && (
                      <Badge variant="default" className="text-xs px-1.5 py-0">
                        Today
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base">{formatDate(day)}</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-2">
                  {dayShifts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Off</p>
                  ) : (
                    dayShifts.map((shift) => {
                      const overnight = isOvernightShift(
                        shift.startTime,
                        shift.endTime,
                      );
                      return (
                        <div
                          key={shift.id}
                          className="bg-primary/10 border border-primary/20 rounded-md p-2 space-y-1"
                        >
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium text-primary">
                              {formatTime(Number(shift.startTime))} –{" "}
                              {formatTime(Number(shift.endTime))}
                            </span>
                            {overnight && (
                              <Moon className="h-3 w-3 text-primary ml-auto" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {shift.department}
                          </p>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
