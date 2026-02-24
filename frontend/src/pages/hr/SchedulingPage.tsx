import React, { useState, useMemo } from 'react';
import { useGetShiftsForDepartment, useAssignShift, useDeleteShift, usePublishSchedule, useUnpublishSchedule } from '../../hooks/useQueries';
import { useGetAllEmployees } from '../../hooks/useQueries';
import { Shift, ShiftStatus } from '../../backend';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Trash2, Moon, Send, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function isOvernightShift(startTime: bigint, endTime: bigint): boolean {
  return Number(endTime) < Number(startTime);
}

export default function SchedulingPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    startTime: '09:00',
    endTime: '17:00',
    department: '',
  });

  const { data: employees = [] } = useGetAllEmployees();
  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [employees]);

  React.useEffect(() => {
    if (!selectedDepartment && departments.length > 0) {
      setSelectedDepartment(departments[0]);
    }
  }, [departments, selectedDepartment]);

  const { data: shifts = [], isLoading } = useGetShiftsForDepartment(selectedDepartment);
  const assignShift = useAssignShift();
  const deleteShift = useDeleteShift();
  const publishSchedule = usePublishSchedule();
  const unpublishSchedule = useUnpublishSchedule();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const weekStartNs = BigInt(currentWeekStart.getTime()) * BigInt(1_000_000);

  const weekShifts = useMemo(() => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return shifts.filter(s => {
      const shiftDate = new Date(Number(s.date) / 1_000_000);
      return shiftDate >= currentWeekStart && shiftDate < weekEnd;
    });
  }, [shifts, currentWeekStart]);

  const isPublished = useMemo(() => {
    if (weekShifts.length === 0) return false;
    return weekShifts.every(s => s.status === ShiftStatus.published);
  }, [weekShifts]);

  function getShiftsForDay(day: Date): Shift[] {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return shifts.filter(s => {
      const shiftDate = new Date(Number(s.date) / 1_000_000);
      return shiftDate >= dayStart && shiftDate <= dayEnd;
    });
  }

  function openAddModal(day: Date) {
    setSelectedDay(day);
    setFormData(prev => ({ ...prev, department: selectedDepartment }));
    setShowAddModal(true);
  }

  async function handleAddShift() {
    if (!selectedDay || !formData.employeeId) {
      toast.error('Please fill in all required fields');
      return;
    }

    const [startH, startM] = formData.startTime.split(':').map(Number);
    const [endH, endM] = formData.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const dayMs = selectedDay.getTime();
    const dateNs = BigInt(dayMs) * BigInt(1_000_000);

    const shift: Shift = {
      id: `shift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employeeId: formData.employeeId,
      date: dateNs,
      startTime: BigInt(startMinutes),
      endTime: BigInt(endMinutes),
      department: formData.department || selectedDepartment,
      status: ShiftStatus.draft,
    };

    try {
      await assignShift.mutateAsync(shift);
      toast.success('Shift added as draft');
      setShowAddModal(false);
    } catch (err) {
      toast.error('Failed to add shift: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleDeleteShift(id: string) {
    try {
      await deleteShift.mutateAsync(id);
      toast.success('Shift deleted');
    } catch (err) {
      toast.error('Failed to delete shift');
    }
  }

  async function handlePublishToggle() {
    if (!selectedDepartment) return;
    try {
      if (isPublished) {
        await unpublishSchedule.mutateAsync({ department: selectedDepartment, weekStart: weekStartNs });
        toast.success('Schedule unpublished — shifts moved back to draft');
      } else {
        await publishSchedule.mutateAsync({ department: selectedDepartment, weekStart: weekStartNs });
        toast.success('Schedule published — employees can now see their shifts');
      }
    } catch (err) {
      toast.error('Failed to update schedule: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  const isPublishing = publishSchedule.isPending || unpublishSchedule.isPending;
  const deptEmployees = employees.filter(e => e.department === selectedDepartment);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scheduling</h1>
          <p className="text-muted-foreground text-sm">Manage employee schedules by department</p>
        </div>
        <div className="flex items-center gap-2">
          {weekShifts.length > 0 && (
            <Button
              onClick={handlePublishToggle}
              disabled={isPublishing}
              variant={isPublished ? 'outline' : 'default'}
              className="gap-2"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isPublished ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isPublished ? 'Unpublish Schedule' : 'Publish Schedule'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="w-full sm:w-56">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() - 7);
            setCurrentWeekStart(d);
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[160px] text-center">
            {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <Button variant="outline" size="icon" onClick={() => {
            const d = new Date(currentWeekStart);
            d.setDate(d.getDate() + 7);
            setCurrentWeekStart(d);
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Draft
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Published
          </span>
          <span className="flex items-center gap-1">
            <Moon className="h-3 w-3" /> Overnight
          </span>
        </div>
      </div>

      {weekShifts.length > 0 && (
        <div className={`rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 ${
          isPublished
            ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
            : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
        }`}>
          {isPublished ? (
            <><Send className="h-4 w-4" /> This week's schedule is published and visible to employees.</>
          ) : (
            <><EyeOff className="h-4 w-4" /> This week's schedule has {weekShifts.filter(s => s.status === ShiftStatus.draft).length} draft shift(s) — not yet visible to employees.</>
          )}
        </div>
      )}

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
              <div key={idx} className="min-h-[120px]">
                <div className={`text-center py-1 rounded-t text-xs font-semibold mb-1 ${
                  isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  <div>{DAYS[day.getDay()]}</div>
                  <div className="text-base font-bold">{day.getDate()}</div>
                </div>
                <div className="space-y-1">
                  {dayShifts.map(shift => {
                    const emp = employees.find(e => e.id === shift.employeeId);
                    const overnight = isOvernightShift(shift.startTime, shift.endTime);
                    const isDraft = shift.status === ShiftStatus.draft;
                    return (
                      <div
                        key={shift.id}
                        className={`rounded p-1 text-xs group relative ${
                          isDraft
                            ? 'bg-amber-100 border border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200'
                            : 'bg-primary/10 border border-primary/30 text-primary-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium truncate text-foreground">
                            {emp?.fullName?.split(' ')[0] ?? shift.employeeId}
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {overnight && <Moon className="h-3 w-3 text-indigo-500" />}
                            {isDraft && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-400 text-amber-700 dark:text-amber-300">Draft</Badge>}
                            <button
                              onClick={() => handleDeleteShift(shift.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {formatTimeFromMinutes(Number(shift.startTime))} – {formatTimeFromMinutes(Number(shift.endTime))}
                          {overnight && <span className="ml-1 text-indigo-500">+1</span>}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => openAddModal(day)}
                    className="w-full rounded border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors py-1 text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Shift — {selectedDay?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Employee *</Label>
              <Select value={formData.employeeId} onValueChange={v => setFormData(p => ({ ...p, employeeId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {deptEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.fullName}</SelectItem>
                  ))}
                  {deptEmployees.length === 0 && employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.fullName} ({emp.department})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))}
                />
                {formData.endTime < formData.startTime && (
                  <p className="text-xs text-indigo-600 flex items-center gap-1">
                    <Moon className="h-3 w-3" /> Overnight shift
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input
                value={formData.department || selectedDepartment}
                onChange={e => setFormData(p => ({ ...p, department: e.target.value }))}
                placeholder="Department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddShift} disabled={assignShift.isPending}>
              {assignShift.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adding...</> : 'Add Shift (Draft)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
