import React, { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { useTimesheets, useManagerReviewTimesheet } from '../../hooks/useQueries';
import { TimesheetStatus } from '../../backend';
import type { Timesheet } from '../../backend';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';

function getStatusLabel(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted:
      return 'Pending Review';
    case TimesheetStatus.managerApproved:
      return 'Approved by You';
    case TimesheetStatus.managerDenied:
      return 'Denied by You';
    case TimesheetStatus.hrApproved:
      return 'HR Approved';
    case TimesheetStatus.hrDenied:
      return 'HR Denied';
    default:
      return 'Unknown';
  }
}

function getStatusColor(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted:
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    case TimesheetStatus.managerApproved:
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    case TimesheetStatus.managerDenied:
      return 'bg-red-500/20 text-red-300 border border-red-500/30';
    case TimesheetStatus.hrApproved:
      return 'bg-green-500/20 text-green-300 border border-green-500/30';
    case TimesheetStatus.hrDenied:
      return 'bg-red-500/20 text-red-300 border border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
  }
}

export default function ManagerTimesheetPage() {
  const { data: timesheets = [], isLoading } = useTimesheets();
  const reviewMutation = useManagerReviewTimesheet();

  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [denyComment, setDenyComment] = useState('');

  const pendingTimesheets = timesheets.filter(
    (ts) => ts.status === TimesheetStatus.submitted
  );
  const reviewedTimesheets = timesheets.filter(
    (ts) => ts.status !== TimesheetStatus.submitted
  );

  const handleApprove = async (ts: Timesheet) => {
    try {
      await reviewMutation.mutateAsync({ id: ts.id, approved: true, comment: '' });
      toast.success(`Timesheet for ${ts.employeeUsername} approved.`);
    } catch (err) {
      toast.error(`Failed to approve: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const openDenyDialog = (ts: Timesheet) => {
    setSelectedTimesheet(ts);
    setDenyComment('');
    setDenyDialogOpen(true);
  };

  const handleDeny = async () => {
    if (!selectedTimesheet) return;
    if (!denyComment.trim()) {
      toast.error('Please provide a reason for denial.');
      return;
    }
    try {
      await reviewMutation.mutateAsync({
        id: selectedTimesheet.id,
        approved: false,
        comment: denyComment.trim(),
      });
      toast.success(`Timesheet for ${selectedTimesheet.employeeUsername} denied.`);
      setDenyDialogOpen(false);
      setSelectedTimesheet(null);
      setDenyComment('');
    } catch (err) {
      toast.error(`Failed to deny: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <ClipboardList className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Timesheet Management</h1>
          <p className="text-slate-400 text-sm">Review and approve team timesheets</p>
        </div>
      </div>

      {/* Pending Review Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          Pending Your Review
          {pendingTimesheets.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full border border-amber-500/30">
              {pendingTimesheets.length}
            </span>
          )}
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : pendingTimesheets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No timesheets pending review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTimesheets.map((ts) => (
              <div
                key={ts.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-700/40 rounded-lg border border-slate-600/30"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-600/50">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{ts.employeeUsername}</p>
                    <p className="text-slate-400 text-sm">Week of {ts.weekStartDate}</p>
                    <p className="text-amber-400 text-sm font-semibold mt-0.5">
                      {ts.totalHours.toFixed(2)} hours
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(ts)}
                    disabled={reviewMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => openDenyDialog(ts)}
                    disabled={reviewMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed Timesheets Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-slate-400" />
          Reviewed / Processed
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : reviewedTimesheets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No reviewed timesheets yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviewedTimesheets
              .slice()
              .sort((a, b) => (a.weekStartDate > b.weekStartDate ? -1 : 1))
              .map((ts) => (
                <div
                  key={ts.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-700/40 rounded-lg border border-slate-600/30"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{ts.employeeUsername}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ts.status)}`}>
                        {getStatusLabel(ts.status)}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Week of {ts.weekStartDate} · {ts.totalHours.toFixed(2)} hours
                    </p>
                    {ts.managerComment && (
                      <p className="text-slate-500 text-xs mt-1">
                        Your comment: {ts.managerComment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent className="bg-slate-800 border border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Deny Timesheet</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {selectedTimesheet && (
              <p className="text-slate-400 text-sm mb-4">
                Denying timesheet for <span className="text-white font-medium">{selectedTimesheet.employeeUsername}</span> (Week of {selectedTimesheet.weekStartDate})
              </p>
            )}
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Reason for Denial <span className="text-red-400">*</span>
            </label>
            <textarea
              value={denyComment}
              onChange={(e) => setDenyComment(e.target.value)}
              placeholder="Please provide a reason..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 resize-none"
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => setDenyDialogOpen(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeny}
              disabled={reviewMutation.isPending || !denyComment.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {reviewMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Deny Timesheet
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
