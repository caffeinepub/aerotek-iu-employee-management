import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import {
  type Timesheet,
  type TimesheetEntry,
  TimesheetStatus,
} from "../../backend";
import {
  useGetTimesheets,
  useHRReviewTimesheet,
  useManagerEditTimesheet,
} from "../../hooks/useQueries";

function getStatusBadgeVariant(
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

function getStatusLabel(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted:
      return "Submitted";
    case TimesheetStatus.managerApproved:
      return "Manager Approved";
    case TimesheetStatus.managerDenied:
      return "Manager Denied";
    case TimesheetStatus.hrApproved:
      return "HR Approved";
    case TimesheetStatus.hrDenied:
      return "HR Denied";
    default:
      return String(status);
  }
}

function calcHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  const total = (endMins - startMins) / 60;
  return total >= 8.5 ? total - 0.5 : total;
}

export default function HRTimesheetPage() {
  const { data: timesheets = [], isLoading } = useGetTimesheets();
  const hrReview = useHRReviewTimesheet();
  const editMutation = useManagerEditTimesheet();

  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [hrComment, setHrComment] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Timesheet | null>(null);
  const [editEntries, setEditEntries] = useState<TimesheetEntry[]>([]);

  const pendingHRTimesheets = timesheets.filter(
    (t: Timesheet) => t.status === TimesheetStatus.managerApproved,
  );

  const filteredAll = timesheets.filter((t: Timesheet) => {
    const matchesSearch =
      !search ||
      t.employeeUsername.toLowerCase().includes(search.toLowerCase()) ||
      t.weekStartDate.includes(search);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (id: string) => {
    try {
      await hrReview.mutateAsync({ id, approved: true, comment: "" });
      toast.success("Timesheet HR approved!");
    } catch (e) {
      toast.error(
        `Failed to approve: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  };

  const handleDenyOpen = (id: string) => {
    setSelectedId(id);
    setHrComment("");
    setDenyDialogOpen(true);
  };

  const handleDenyConfirm = async () => {
    try {
      await hrReview.mutateAsync({
        id: selectedId,
        approved: false,
        comment: hrComment,
      });
      toast.success("Timesheet HR denied.");
      setDenyDialogOpen(false);
    } catch (e) {
      toast.error(
        `Failed to deny: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  };

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          HR Timesheet Review
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review, edit, and give final approval for timesheets
        </p>
      </div>

      {/* Pending HR Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Pending HR Approval ({pendingHRTimesheets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingHRTimesheets.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No timesheets pending HR approval.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingHRTimesheets.map((ts: Timesheet) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">{ts.employeeUsername}</p>
                    <p className="text-xs text-muted-foreground">
                      Week of {ts.weekStartDate} · {ts.totalHours.toFixed(2)}{" "}
                      hrs
                    </p>
                    {ts.managerComment && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Manager: {ts.managerComment}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-amber-600 border-amber-500 hover:bg-amber-50"
                      onClick={() => openEditDialog(ts)}
                      disabled={hrReview.isPending || editMutation.isPending}
                      data-ocid="hr.timesheet.edit_button"
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => handleApprove(ts.id)}
                      disabled={hrReview.isPending || editMutation.isPending}
                      data-ocid="hr.timesheet.approve_button"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => handleDenyOpen(ts.id)}
                      disabled={hrReview.isPending || editMutation.isPending}
                      data-ocid="hr.timesheet.deny_button"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle>All Timesheets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee or week..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-ocid="hr.timesheets.search_input"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
              data-ocid="hr.timesheets.status_select"
            >
              <option value="all">All Statuses</option>
              <option value={TimesheetStatus.submitted}>Submitted</option>
              <option value={TimesheetStatus.managerApproved}>
                Manager Approved
              </option>
              <option value={TimesheetStatus.managerDenied}>
                Manager Denied
              </option>
              <option value={TimesheetStatus.hrApproved}>HR Approved</option>
              <option value={TimesheetStatus.hrDenied}>HR Denied</option>
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredAll.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No timesheets found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredAll.map((ts: Timesheet) => (
                <div
                  key={ts.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="text-sm font-medium">{ts.employeeUsername}</p>
                    <p className="text-xs text-muted-foreground">
                      Week of {ts.weekStartDate} · {ts.totalHours.toFixed(2)}{" "}
                      hrs
                    </p>
                    {ts.managerComment && (
                      <p className="text-xs text-muted-foreground">
                        Manager: {ts.managerComment}
                      </p>
                    )}
                    {ts.hrComment && (
                      <p className="text-xs text-muted-foreground">
                        HR: {ts.hrComment}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(ts)}
                      disabled={editMutation.isPending}
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                      data-ocid="hr.timesheets.edit_button"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Badge variant={getStatusBadgeVariant(ts.status)}>
                      {getStatusLabel(ts.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent data-ocid="hr.deny_timesheet.dialog">
          <DialogHeader>
            <DialogTitle>HR Deny Timesheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for HR denial.
            </p>
            <Textarea
              placeholder="Enter HR denial reason..."
              value={hrComment}
              onChange={(e) => setHrComment(e.target.value)}
              rows={3}
              data-ocid="hr.deny_timesheet.textarea"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDenyDialogOpen(false)}
              data-ocid="hr.deny_timesheet.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDenyConfirm}
              disabled={hrReview.isPending || !hrComment.trim()}
              data-ocid="hr.deny_timesheet.confirm_button"
            >
              {hrReview.isPending ? "Denying..." : "Deny Timesheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Timesheet Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="hr.edit_timesheet.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-500" />
              Edit Timesheet — {editTarget?.employeeUsername}
            </DialogTitle>
            <DialogDescription>
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
                className="border rounded-lg p-4 space-y-3 bg-muted/30"
                data-ocid={`hr.edit_timesheet.entry.${i + 1}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-600 text-xs font-bold uppercase tracking-wider">
                    Entry {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEntry(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    data-ocid={`hr.edit_timesheet.remove_entry_button.${i + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">Date</Label>
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => updateEntry(i, "date", e.target.value)}
                      data-ocid={`hr.edit_timesheet.date_input.${i + 1}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">
                      Building # (optional)
                    </Label>
                    <Input
                      type="text"
                      value={entry.buildingNumber ?? ""}
                      onChange={(e) =>
                        updateEntry(i, "buildingNumber", e.target.value)
                      }
                      placeholder="e.g. 4"
                      data-ocid={`hr.edit_timesheet.building_input.${i + 1}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Start Time</Label>
                    <Input
                      type="time"
                      value={entry.startTime}
                      onChange={(e) =>
                        updateEntry(i, "startTime", e.target.value)
                      }
                      data-ocid={`hr.edit_timesheet.start_time_input.${i + 1}`}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">End Time</Label>
                    <Input
                      type="time"
                      value={entry.endTime}
                      onChange={(e) =>
                        updateEntry(i, "endTime", e.target.value)
                      }
                      data-ocid={`hr.edit_timesheet.end_time_input.${i + 1}`}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Calculated:{" "}
                  <span className="text-amber-600 font-semibold">
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
              className="w-full border-dashed"
              data-ocid="hr.edit_timesheet.add_entry_button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Entry
            </Button>

            <div className="border rounded-lg px-4 py-2 flex items-center justify-between bg-amber-50">
              <span className="text-sm font-medium">Total Hours</span>
              <span className="text-amber-600 font-bold text-lg">
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
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              data-ocid="hr.edit_timesheet.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-white font-semibold"
              data-ocid="hr.edit_timesheet.save_button"
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
