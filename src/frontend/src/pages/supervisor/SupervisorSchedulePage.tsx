import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Loader2, Moon } from "lucide-react";
import React, { useState, useMemo } from "react";
import type { Shift } from "../../backend";
import { useGetShiftsForDepartment } from "../../hooks/useQueries";
import { useGetAllEmployees } from "../../hooks/useQueries";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTimeFromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function isOvernightShift(startTime: bigint, endTime: bigint): boolean {
  return Number(endTime) < Number(startTime);
}

export default function SupervisorSchedulePage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    getWeekStart(new Date()),
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const { data: employees = [] } = useGetAllEmployees();
  const departments = useMemo(() => {
    const depts = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  React.useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments, selectedDepartment]);

  const { data: shifts = [], isLoading } =
    useGetShiftsForDepartment(selectedDepartment);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  function getShiftsForDay(day: Date): Shift[] {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return shifts.filter((s) => {
      const shiftDate = new Date(Number(s.date) / 1_000_000);
      return shiftDate >= dayStart && shiftDate <= dayEnd;
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Department Schedules
        </h1>
        <p className="text-muted-foreground text-sm">
          View published schedules by department
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="w-full sm:w-56">
          <Select
            value={selectedDepartment}
            onValueChange={setSelectedDepartment}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const d = new Date(currentWeekStart);
              d.setDate(d.getDate() - 7);
              setCurrentWeekStart(d);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {currentWeekStart.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            –{" "}
            {weekDays[6].toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const d = new Date(currentWeekStart);
              d.setDate(d.getDate() + 7);
              setCurrentWeekStart(d);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
          <Moon className="h-3 w-3" /> = Overnight shift
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {weekDays.map((day, idx) => {
            const dayShifts = getShiftsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: weekDays is a fixed 7-day array
              <div key={idx} className="min-h-[100px]">
                <div
                  className={`text-center py-1 rounded-t text-xs font-semibold mb-1 ${
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <div>{DAYS[day.getDay()]}</div>
                  <div className="text-base font-bold">{day.getDate()}</div>
                </div>
                <div className="space-y-1">
                  {dayShifts.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-2">
                      —
                    </div>
                  ) : (
                    dayShifts.map((shift) => {
                      const emp = employees.find(
                        (e) => e.id === shift.employeeId,
                      );
                      const overnight = isOvernightShift(
                        shift.startTime,
                        shift.endTime,
                      );
                      return (
                        <div
                          key={shift.id}
                          className="rounded p-1 text-xs bg-primary/10 border border-primary/30"
                        >
                          <div className="flex items-center gap-1">
                            {overnight && (
                              <Moon className="h-3 w-3 text-indigo-500 shrink-0" />
                            )}
                            <span className="font-medium text-foreground truncate">
                              {emp?.fullName?.split(" ")[0] ?? shift.employeeId}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5">
                            {formatTimeFromMinutes(Number(shift.startTime))} –{" "}
                            {formatTimeFromMinutes(Number(shift.endTime))}
                            {overnight && (
                              <span className="ml-1 text-indigo-500">+1</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
