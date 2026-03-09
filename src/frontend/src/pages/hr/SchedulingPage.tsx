import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Globe,
  Moon,
  Plus,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { type Employee, type Shift, ShiftStatus } from "../../backend";
import {
  useAssignShift,
  useDeleteShift,
  useGetAllEmployees,
  useGetShiftsForDepartment,
  usePublishSchedule,
  useUnpublishSchedule,
} from "../../hooks/useQueries";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(minutes: bigint): string {
  const mins = Number(minutes);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function isOvernightShift(shift: Shift): boolean {
  return Number(shift.endTime) <= Number(shift.startTime);
}

export default function SchedulingPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDept, setSelectedDept] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [newShift, setNewShift] = useState({
    employeeId: "",
    startTime: "09:00",
    endTime: "17:00",
  });

  const weekStart = getWeekStart(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: employees = [], isLoading: empLoading } = useGetAllEmployees();
  const { data: shifts = [], isLoading: shiftsLoading } =
    useGetShiftsForDepartment(selectedDept);
  const assignShift = useAssignShift();
  const deleteShift = useDeleteShift();
  const publishSchedule = usePublishSchedule();
  const unpublishSchedule = useUnpublishSchedule();

  const departments = Array.from(
    new Set(employees.map((e: Employee) => e.department).filter(Boolean)),
  );

  const weekShifts = shifts.filter((s: Shift) => {
    const d = Number(s.date);
    return d >= weekStart.getTime() && d < weekEnd.getTime();
  });

  const hasPublished = weekShifts.some(
    (s: Shift) => s.status === ShiftStatus.published,
  );
  const hasDraft = weekShifts.some(
    (s: Shift) => s.status === ShiftStatus.draft,
  );

  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(weekEnd.getTime() - 1).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const getShiftsForDay = (dayIndex: number): Shift[] => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(dayStart.getDate() + dayIndex);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return weekShifts.filter((s: Shift) => {
      const d = Number(s.date);
      return d >= dayStart.getTime() && d < dayEnd.getTime();
    });
  };

  const handleOpenAddDialog = (day: Date) => {
    setSelectedDay(day);
    setNewShift({ employeeId: "", startTime: "09:00", endTime: "17:00" });
    setAddDialogOpen(true);
  };

  const handleAddShift = async () => {
    if (!selectedDay || !newShift.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    const shift: Shift = {
      id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      employeeId: newShift.employeeId,
      date: BigInt(selectedDay.getTime()),
      startTime: BigInt(timeToMinutes(newShift.startTime)),
      endTime: BigInt(timeToMinutes(newShift.endTime)),
      department: selectedDept,
      status: ShiftStatus.draft,
    };
    try {
      await assignShift.mutateAsync(shift);
      toast.success("Shift added!");
      setAddDialogOpen(false);
    } catch (e) {
      toast.error(
        `Failed to add shift: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await deleteShift.mutateAsync(id);
      toast.success("Shift deleted.");
    } catch (e) {
      toast.error(
        `Failed to delete: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  };

  const handlePublish = async () => {
    if (!selectedDept) {
      toast.error("Please select a department first.");
      return;
    }
    try {
      const count = await publishSchedule.mutateAsync({
        department: selectedDept,
        weekStart: BigInt(weekStart.getTime()),
      });
      toast.success(`Published ${count} shifts!`);
    } catch (e) {
      toast.error(
        `Failed to publish: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  };

  const handleUnpublish = async () => {
    if (!selectedDept) {
      toast.error("Please select a department first.");
      return;
    }
    try {
      const count = await unpublishSchedule.mutateAsync({
        department: selectedDept,
        weekStart: BigInt(weekStart.getTime()),
      });
      toast.success(`Unpublished ${count} shifts.`);
    } catch (e) {
      toast.error(
        `Failed to unpublish: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  };

  const deptEmployees = employees.filter(
    (e: Employee) => !selectedDept || e.department === selectedDept,
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scheduling</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and publish employee schedules
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasPublished && (
            <Button
              variant="outline"
              onClick={handleUnpublish}
              disabled={unpublishSchedule.isPending}
              className="text-amber-600 border-amber-600 hover:bg-amber-50"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              {unpublishSchedule.isPending
                ? "Unpublishing..."
                : "Unpublish Schedule"}
            </Button>
          )}
          {hasDraft && (
            <Button
              onClick={handlePublish}
              disabled={publishSchedule.isPending}
            >
              <Globe className="h-4 w-4 mr-2" />
              {publishSchedule.isPending ? "Publishing..." : "Publish Schedule"}
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {weekLabel}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="w-full sm:w-56">
          {empLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select value={selectedDept} onValueChange={setSelectedDept}>
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
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      {!selectedDept ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Select a department to view and manage shifts.</p>
        </div>
      ) : shiftsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          {DAYS.map((d) => (
            <Skeleton key={d} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          {DAYS.map((day, idx) => {
            const dayShifts = getShiftsForDay(idx);
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + idx);
            const isToday =
              dayDate.toDateString() === new Date().toDateString();

            return (
              <Card
                key={day}
                className={`min-h-[140px] ${isToday ? "border-primary" : ""}`}
              >
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-xs font-semibold flex items-center justify-between">
                    <span className={isToday ? "text-primary" : ""}>{day}</span>
                    <span
                      className={`text-xs font-normal ${isToday ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {dayDate.getDate()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 space-y-1">
                  {dayShifts.map((shift: Shift) => {
                    const emp = employees.find(
                      (e: Employee) => e.id === shift.employeeId,
                    );
                    const overnight = isOvernightShift(shift);
                    return (
                      <div
                        key={shift.id}
                        className={`rounded p-1.5 text-xs group relative ${
                          shift.status === ShiftStatus.published
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted border border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            {emp?.fullName ?? shift.employeeId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(shift.id)}
                            className="opacity-0 group-hover:opacity-100 text-destructive ml-1 flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <span>
                            {formatTime(shift.startTime)}–
                            {formatTime(shift.endTime)}
                          </span>
                          {overnight && <Moon className="h-3 w-3" />}
                        </div>
                        <Badge
                          variant={
                            shift.status === ShiftStatus.published
                              ? "default"
                              : "secondary"
                          }
                          className="text-[10px] px-1 py-0 h-4 mt-0.5"
                        >
                          {shift.status}
                        </Badge>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleOpenAddDialog(dayDate)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed rounded p-1 mt-1 flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Shift Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Shift –{" "}
              {selectedDay?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select
                value={newShift.employeeId}
                onValueChange={(v) =>
                  setNewShift((s) => ({ ...s, employeeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {deptEmployees.map((e: Employee) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) =>
                    setNewShift((s) => ({ ...s, startTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) =>
                    setNewShift((s) => ({ ...s, endTime: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddShift} disabled={assignShift.isPending}>
              {assignShift.isPending ? "Adding..." : "Add Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
