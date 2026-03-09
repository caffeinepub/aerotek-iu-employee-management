import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import {
  type Timesheet,
  type TimesheetEntry,
  TimesheetStatus,
} from "../../backend";
import {
  useGetTimesheets,
  useManagerEditTimesheet,
  useManagerReviewTimesheet,
} from "../../hooks/useQueries";

function statusLabel(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted:
      return "Pending Review";
    case TimesheetStatus.managerApproved:
      return "Approved";
    case TimesheetStatus.managerDenied:
      return "Denied";
    case TimesheetStatus.hrApproved:
      return "HR Approved";
    case TimesheetStatus.hrDenied:
      return "HR Denied";
    default:
      return String(status);
  }
}

function statusVariant(
  status: TimesheetStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case TimesheetStatus.submitted:
      return "secondary";
    case TimesheetStatus.managerApproved:
      return "default";
    case TimesheetStatus.managerDenied:
      return "destructive";
    case TimesheetStatus.hrApproved:
      return "default";
    case TimesheetStatus.hrDenied:
      return "destructive";
    default:
      return "outline";
  }
}

function calcHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60; // overnight
  const total = (endMins - startMins) / 60;
  // Deduct 30-min unpaid break if >= 8.5 hours
  return total >= 8.5 ? total - 0.5 : total;
}

export default function ManagerTimesheetPage() {
  const { data: timesheets = [], isLoading } = useGetTimesheets();
  const reviewMutation = useManagerReviewTimesheet();
  const editMutation = useManagerEditTimesheet();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [denyTarget, setDenyTarget] = useState<Timesheet | null>(null);
  const [denyComment, setDenyComment] = useState("");

  // Edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Timesheet | null>(null);
  const [editEntries, setEditEntries] = useState<TimesheetEntry[]>([]);

  const pending = timesheets.filter(
    (ts) => ts.status === TimesheetStatus.submitted,
  );
  const reviewed = timesheets.filter(
    (ts) => ts.status !== TimesheetStatus.submitted,
  );

  async function handleApprove(ts: Timesheet) {
    try {
      await reviewMutation.mutateAsync({
        id: ts.id,
        approved: true,
        comment: "",
      });
      toast.success("Timesheet approved successfully");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve timesheet",
      );
    }
  }

  function openDenyDialog(ts: Timesheet) {
    setDenyTarget(ts);
    setDenyComment("");
    setDenyDialogOpen(true);
  }

  async function handleDenyConfirm() {
    if (!denyTarget) return;
    try {
      await reviewMutation.mutateAsync({
        id: denyTarget.id,
        approved: false,
        comment: denyComment,
      });
      toast.success("Timesheet denied");
      setDenyDialogOpen(false);
      setDenyTarget(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deny timesheet",
      );
    }
  }

  function openEditDialog(ts: Timesheet) {
    setEditTarget(ts);
    setEditEntries(ts.entries.map((e) => ({ ...e })));
    setEditDialogOpen(true);
  }

  function updateEntry(
    index: number,
    field: keyof TimesheetEntry,
    value: string,
  ) {
    setEditEntries((prev) => {
      const next = [...prev];
      const entry = { ...next[index], [field]: value };
      if (field === "startTime" || field === "endTime") {
        entry.hoursWorked = calcHours(
          field === "startTime" ? value : entry.startTime,
          field === "endTime" ? value : entry.endTime,
        );
      }
      next[index] = entry;
      return next;
    });
  }

  function addEntry() {
    setEditEntries((prev) => [
      ...prev,
      {
        date: "",
        startTime: "",
        endTime: "",
        hoursWorked: 0,
        buildingNumber: "",
      },
    ]);
  }

  function removeEntry(index: number) {
    setEditEntries((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleEditSave() {
    if (!editTarget) return;
    const validEntries = editEntries.filter(
      (e) => e.date && e.startTime && e.endTime,
    );
    if (validEntries.length === 0) {
      toast.error("At least one complete entry is required");
      return;
    }
    const totalHours = validEntries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const updated: Timesheet = {
      ...editTarget,
      entries: validEntries,
      totalHours,
      status: TimesheetStatus.submitted,
    };
    try {
      await editMutation.mutateAsync(updated);
      toast.success("Timesheet updated successfully");
      setEditDialogOpen(false);
      setEditTarget(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update timesheet",
      );
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-amber-400" />
            Timesheet Review
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Review, edit, approve or deny employee timesheets.
          </p>
        </div>

        {/* Pending */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Pending Your Review
            {pending.length > 0 && (
              <span className="ml-1 bg-amber-500 text-navy-950 text-xs font-bold px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </h2>

          {pending.length === 0 ? (
            <div className="bg-navy-900 border border-navy-700 rounded-xl p-8 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No timesheets pending review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((ts) => (
                <TimesheetCard
                  key={ts.id}
                  ts={ts}
                  expanded={expandedId === ts.id}
                  onToggle={() => toggleExpand(ts.id)}
                  actions={
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(ts)}
                        disabled={
                          reviewMutation.isPending || editMutation.isPending
                        }
                        className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                        data-ocid="manager.timesheet.edit_button"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(ts)}
                        disabled={
                          reviewMutation.isPending || editMutation.isPending
                        }
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        data-ocid="manager.timesheet.approve_button"
                      >
                        {reviewMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDenyDialog(ts)}
                        disabled={
                          reviewMutation.isPending || editMutation.isPending
                        }
                        data-ocid="manager.timesheet.deny_button"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Reviewed */}
        {reviewed.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-slate-400" />
              Reviewed / Processed
            </h2>
            <div className="space-y-3">
              {reviewed.map((ts) => (
                <TimesheetCard
                  key={ts.id}
                  ts={ts}
                  expanded={expandedId === ts.id}
                  onToggle={() => toggleExpand(ts.id)}
                  actions={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(ts)}
                      disabled={editMutation.isPending}
                      className="border-amber-500 text-amber-400 hover:bg-amber-500/10"
                      data-ocid="manager.timesheet.edit_reviewed_button"
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent
          className="bg-navy-900 border-navy-700 text-white"
          data-ocid="manager.deny_timesheet.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white">Deny Timesheet</DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide a reason for denying this timesheet (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={denyComment}
            onChange={(e) => setDenyComment(e.target.value)}
            placeholder="Enter reason for denial..."
            className="bg-navy-800 border-navy-600 text-white placeholder:text-slate-500 min-h-[100px]"
            data-ocid="manager.deny_timesheet.textarea"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDenyDialogOpen(false)}
              className="text-slate-300"
              data-ocid="manager.deny_timesheet.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDenyConfirm}
              disabled={reviewMutation.isPending}
              data-ocid="manager.deny_timesheet.confirm_button"
            >
              {reviewMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Confirm Deny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Timesheet Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="bg-navy-900 border-navy-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="manager.edit_timesheet.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-400" />
              Edit Timesheet — {editTarget?.employeeUsername}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Modify entries below. Hours are auto-calculated (30-min unpaid
              break deducted for shifts 8.5h+). When saved, timesheet is
              re-submitted for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editEntries.map((entry, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: index is stable for edit entries
                key={i}
                className="bg-navy-800 border border-navy-600 rounded-lg p-4 space-y-3"
                data-ocid={`manager.edit_timesheet.entry.${i + 1}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                    Entry {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEntry(i)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    data-ocid={`manager.edit_timesheet.remove_entry_button.${i + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-xs mb-1 block">
                      Date
                    </Label>
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(i, "date", e.target.value)}
                      className="bg-navy-700 border-navy-500 text-white"
                      data-ocid={`manager.edit_timesheet.date_input.${i + 1}`}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs mb-1 block">
                      Building # (optional)
                    </Label>
                    <Input
                      type="text"
                      value={entry.buildingNumber ?? ""}
                      onChange={(e) =>
                        updateEntry(i, "buildingNumber", e.target.value)
                      }
                      placeholder="e.g. 4"
                      className="bg-navy-700 border-navy-500 text-white placeholder:text-slate-500"
                      data-ocid={`manager.edit_timesheet.building_input.${i + 1}`}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs mb-1 block">
                      Start Time
                    </Label>
                    <Input
                      type="time"
                      value={entry.startTime}
                      onChange={(e) =>
                        updateEntry(i, "startTime", e.target.value)
                      }
                      className="bg-navy-700 border-navy-500 text-white"
                      data-ocid={`manager.edit_timesheet.start_time_input.${i + 1}`}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs mb-1 block">
                      End Time
                    </Label>
                    <Input
                      type="time"
                      value={entry.endTime}
                      onChange={(e) =>
                        updateEntry(i, "endTime", e.target.value)
                      }
                      className="bg-navy-700 border-navy-500 text-white"
                      data-ocid={`manager.edit_timesheet.end_time_input.${i + 1}`}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  Calculated:{" "}
                  <span className="text-amber-400 font-semibold">
                    {entry.hoursWorked.toFixed(2)} paid hrs
                  </span>
                  {entry.startTime &&
                    entry.endTime &&
                    " (overnight shifts supported)"}
                </p>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addEntry}
              className="w-full border-dashed border-navy-500 text-slate-400 hover:text-white hover:border-amber-500"
              data-ocid="manager.edit_timesheet.add_entry_button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Entry
            </Button>

            <div className="bg-navy-800 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center justify-between">
              <span className="text-slate-300 text-sm">Total Hours</span>
              <span className="text-amber-400 font-bold text-lg">
                {editEntries
                  .filter((e) => e.date && e.startTime && e.endTime)
                  .reduce((s, e) => s + e.hoursWorked, 0)
                  .toFixed(2)}{" "}
                hrs
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              className="text-slate-300"
              data-ocid="manager.edit_timesheet.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-navy-950 font-semibold"
              data-ocid="manager.edit_timesheet.save_button"
            >
              {editMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save & Re-submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── TimesheetCard sub-component ───────────────────────────────────────────────

interface TimesheetCardProps {
  ts: Timesheet;
  expanded: boolean;
  onToggle: () => void;
  actions?: React.ReactNode;
}

function TimesheetCard({
  ts,
  expanded,
  onToggle,
  actions,
}: TimesheetCardProps) {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden hover:border-navy-600 transition-colors">
      {/* Summary row */}
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-navy-800 border border-navy-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate">
              {ts.employeeUsername}
            </p>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <CalendarDays className="w-3 h-3" />
              Week of {ts.weekStartDate} · {ts.totalHours.toFixed(2)} hrs ·{" "}
              {ts.entries.length} day{ts.entries.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <Badge variant={statusVariant(ts.status)} className="text-xs">
            {statusLabel(ts.status)}
          </Badge>
          {actions}
          <button
            type="button"
            onClick={onToggle}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded entries */}
      {expanded && (
        <div className="border-t border-navy-700 px-5 py-4 bg-navy-800/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {ts.entries.map((entry, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: index is stable for view-only entries
                key={i}
                className="bg-navy-800 border border-navy-700 rounded-lg p-3"
              >
                <p className="text-xs font-bold text-amber-400 mb-1">
                  {entry.date}
                </p>
                <p className="text-sm text-white">
                  {entry.startTime} – {entry.endTime}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {entry.hoursWorked.toFixed(2)} paid hrs
                </p>
                {entry.buildingNumber && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bldg #{entry.buildingNumber}
                  </p>
                )}
              </div>
            ))}
          </div>
          {(ts.managerComment || ts.hrComment) && (
            <div className="flex items-start gap-2 text-xs text-slate-400 bg-navy-900 rounded-lg p-3 border border-navy-700">
              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{ts.managerComment || ts.hrComment}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
