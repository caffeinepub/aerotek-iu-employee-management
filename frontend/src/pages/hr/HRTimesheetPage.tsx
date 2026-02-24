import React, { useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, CheckCircle, XCircle, Clock, Search, Filter, User } from 'lucide-react';
import { useTimesheets, useHrReviewTimesheet } from '../../hooks/useQueries';
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
      return 'Pending Manager';
    case TimesheetStatus.managerApproved:
      return 'Pending HR Approval';
    case TimesheetStatus.managerDenied:
      return 'Denied by Manager';
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

export default function HRTimesheetPage() {
  const { data: timesheets = [], isLoading } = useTimesheets();
  const hrReviewMutation = useHrReviewTimesheet();

  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [hrComment, setHrComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const pendingHRTimesheets = timesheets.filter(
    (ts) => ts.status === TimesheetStatus.managerApproved
  );

  const filteredTimesheets = timesheets.filter((ts) => {
    const matchesSearch =
      searchQuery === '' ||
      ts.employeeUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ts.weekStartDate.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || ts.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleFinalApprove = async (ts: Timesheet) => {
    try {
      await hrReviewMutation.mutateAsync({ id: ts.id, approved: true, comment: '' });
      toast.success(`Timesheet for ${ts.employeeUsername} finally approved.`);
    } catch (err) {
      toast.error(`Failed to approve: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const openDenyDialog = (ts: Timesheet) => {
    setSelectedTimesheet(ts);
    setHrComment('');
    setDenyDialogOpen(true);
  };

  const handleFinalDeny = async () => {
    if (!selectedTimesheet) return;
    if (!hrComment.trim()) {
      toast.error('Please provide a reason for denial.');
      return;
    }
    try {
      await hrReviewMutation.mutateAsync({
        id: selectedTimesheet.id,
        approved: false,
        comment: hrComment.trim(),
      });
      toast.success(`Timesheet for ${selectedTimesheet.employeeUsername} denied.`);
      setDenyDialogOpen(false);
      setSelectedTimesheet(null);
      setHrComment('');
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
          <p className="text-slate-400 text-sm">Final approval for all employee timesheets</p>
        </div>
      </div>

      {/* Pending HR Approval Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          Pending Final HR Approval
          {pendingHRTimesheets.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full border border-amber-500/30">
              {pendingHRTimesheets.length}
            </span>
          )}
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : pendingHRTimesheets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No timesheets pending final HR approval.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingHRTimesheets.map((ts) => (
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
                    {ts.managerComment && (
                      <p className="text-slate-400 text-xs mt-1">
                        Manager note: {ts.managerComment}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFinalApprove(ts)}
                    disabled={hrReviewMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Final Approve
                  </button>
                  <button
                    onClick={() => openDenyDialog(ts)}
                    disabled={hrReviewMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Final Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Timesheets Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-slate-400" />
          All Timesheets
        </h2>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by employee or week..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value={TimesheetStatus.submitted}>Pending Manager</option>
              <option value={TimesheetStatus.managerApproved}>Pending HR</option>
              <option value={TimesheetStatus.managerDenied}>Denied by Manager</option>
              <option value={TimesheetStatus.hrApproved}>HR Approved</option>
              <option value={TimesheetStatus.hrDenied}>HR Denied</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredTimesheets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No timesheets found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Employee</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Week</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">Hours</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Manager Note</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">HR Note</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimesheets
                  .slice()
                  .sort((a, b) => (a.weekStartDate > b.weekStartDate ? -1 : 1))
                  .map((ts) => (
                    <tr key={ts.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4 text-white text-sm font-medium">{ts.employeeUsername}</td>
                      <td className="py-3 px-4 text-slate-300 text-sm">{ts.weekStartDate}</td>
                      <td className="py-3 px-4 text-right text-amber-400 text-sm font-semibold">
                        {ts.totalHours.toFixed(2)}h
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ts.status)}`}>
                          {getStatusLabel(ts.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs max-w-[150px] truncate">
                        {ts.managerComment ?? '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs max-w-[150px] truncate">
                        {ts.hrComment ?? '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HR Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent className="bg-slate-800 border border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Final Denial — HR Review</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {selectedTimesheet && (
              <p className="text-slate-400 text-sm mb-4">
                Denying timesheet for{' '}
                <span className="text-white font-medium">{selectedTimesheet.employeeUsername}</span>{' '}
                (Week of {selectedTimesheet.weekStartDate})
              </p>
            )}
            <label className="block text-sm font-medium text-slate-300 mb-2">
              HR Denial Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={hrComment}
              onChange={(e) => setHrComment(e.target.value)}
              placeholder="Please provide a reason for HR denial..."
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
              onClick={handleFinalDeny}
              disabled={hrReviewMutation.isPending || !hrComment.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {hrReviewMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Confirm Denial
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
