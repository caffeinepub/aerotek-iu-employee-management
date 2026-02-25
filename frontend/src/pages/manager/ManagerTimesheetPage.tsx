import React, { useState } from 'react';
import { useGetTimesheets, useManagerReviewTimesheet } from '../../hooks/useQueries';
import { Timesheet, TimesheetStatus } from '../../backend';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  ClipboardList,
  User,
  CalendarDays,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

function statusLabel(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted: return 'Pending Review';
    case TimesheetStatus.managerApproved: return 'Approved';
    case TimesheetStatus.managerDenied: return 'Denied';
    case TimesheetStatus.hrApproved: return 'HR Approved';
    case TimesheetStatus.hrDenied: return 'HR Denied';
    default: return String(status);
  }
}

function statusVariant(status: TimesheetStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case TimesheetStatus.submitted: return 'secondary';
    case TimesheetStatus.managerApproved: return 'default';
    case TimesheetStatus.managerDenied: return 'destructive';
    case TimesheetStatus.hrApproved: return 'default';
    case TimesheetStatus.hrDenied: return 'destructive';
    default: return 'outline';
  }
}

export default function ManagerTimesheetPage() {
  const { data: timesheets = [], isLoading } = useGetTimesheets();
  const reviewMutation = useManagerReviewTimesheet();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [denyTarget, setDenyTarget] = useState<Timesheet | null>(null);
  const [denyComment, setDenyComment] = useState('');

  const pending = timesheets.filter(ts => ts.status === TimesheetStatus.submitted);
  const reviewed = timesheets.filter(ts => ts.status !== TimesheetStatus.submitted);

  async function handleApprove(ts: Timesheet) {
    try {
      await reviewMutation.mutateAsync({ id: ts.id, approved: true, comment: '' });
      toast.success('Timesheet approved successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve timesheet');
    }
  }

  function openDenyDialog(ts: Timesheet) {
    setDenyTarget(ts);
    setDenyComment('');
    setDenyDialogOpen(true);
  }

  async function handleDenyConfirm() {
    if (!denyTarget) return;
    try {
      await reviewMutation.mutateAsync({ id: denyTarget.id, approved: false, comment: denyComment });
      toast.success('Timesheet denied');
      setDenyDialogOpen(false);
      setDenyTarget(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to deny timesheet');
    }
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
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
          <p className="text-slate-400 mt-1 text-sm">Review and approve or deny employee timesheets.</p>
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
              {pending.map(ts => (
                <TimesheetCard
                  key={ts.id}
                  ts={ts}
                  expanded={expandedId === ts.id}
                  onToggle={() => toggleExpand(ts.id)}
                  actions={
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(ts)}
                        disabled={reviewMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        {reviewMutation.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><CheckCircle2 className="w-4 h-4 mr-1" />Approve</>
                        }
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDenyDialog(ts)}
                        disabled={reviewMutation.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" />Deny
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
              {reviewed.map(ts => (
                <TimesheetCard
                  key={ts.id}
                  ts={ts}
                  expanded={expandedId === ts.id}
                  onToggle={() => toggleExpand(ts.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent className="bg-navy-900 border-navy-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Deny Timesheet</DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide a reason for denying this timesheet (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={denyComment}
            onChange={e => setDenyComment(e.target.value)}
            placeholder="Enter reason for denial..."
            className="bg-navy-800 border-navy-600 text-white placeholder:text-slate-500 min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDenyDialogOpen(false)} className="text-slate-300">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDenyConfirm}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Deny
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

function TimesheetCard({ ts, expanded, onToggle, actions }: TimesheetCardProps) {
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-xl overflow-hidden hover:border-navy-600 transition-colors">
      {/* Summary row */}
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-navy-800 border border-navy-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm truncate">{ts.employeeUsername}</p>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <CalendarDays className="w-3 h-3" />
              Week of {ts.weekStartDate} · {ts.totalHours.toFixed(2)} hrs · {ts.entries.length} day{ts.entries.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={statusVariant(ts.status)} className="text-xs">
            {statusLabel(ts.status)}
          </Badge>
          {actions}
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded entries */}
      {expanded && (
        <div className="border-t border-navy-700 px-5 py-4 bg-navy-800/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {ts.entries.map((entry, i) => (
              <div key={i} className="bg-navy-800 border border-navy-700 rounded-lg p-3">
                <p className="text-xs font-bold text-amber-400 mb-1">{entry.date}</p>
                <p className="text-sm text-white">{entry.startTime} – {entry.endTime}</p>
                <p className="text-xs text-slate-400 mt-1">{entry.hoursWorked.toFixed(2)} paid hrs</p>
                {entry.buildingNumber && (
                  <p className="text-xs text-slate-500 mt-0.5">Bldg #{entry.buildingNumber}</p>
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
