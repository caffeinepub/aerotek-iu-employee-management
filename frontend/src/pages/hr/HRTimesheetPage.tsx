import React, { useState } from 'react';
import { useGetTimesheets, useHRReviewTimesheet } from '../../hooks/useQueries';
import { Timesheet, TimesheetStatus } from '../../backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ClipboardList, CheckCircle, XCircle, Search } from 'lucide-react';

function getStatusBadgeVariant(status: TimesheetStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case TimesheetStatus.submitted: return 'secondary';
    case TimesheetStatus.managerApproved: return 'default';
    case TimesheetStatus.managerDenied: return 'destructive';
    case TimesheetStatus.hrApproved: return 'default';
    case TimesheetStatus.hrDenied: return 'destructive';
    default: return 'outline';
  }
}

function getStatusLabel(status: TimesheetStatus): string {
  switch (status) {
    case TimesheetStatus.submitted: return 'Submitted';
    case TimesheetStatus.managerApproved: return 'Manager Approved';
    case TimesheetStatus.managerDenied: return 'Manager Denied';
    case TimesheetStatus.hrApproved: return 'HR Approved';
    case TimesheetStatus.hrDenied: return 'HR Denied';
    default: return String(status);
  }
}

export default function HRTimesheetPage() {
  const { data: timesheets = [], isLoading } = useGetTimesheets();
  const hrReview = useHRReviewTimesheet();

  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [hrComment, setHrComment] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const pendingHRTimesheets = timesheets.filter(
    (t: Timesheet) => t.status === TimesheetStatus.managerApproved
  );

  const filteredAll = timesheets.filter((t: Timesheet) => {
    const matchesSearch =
      !search ||
      t.employeeUsername.toLowerCase().includes(search.toLowerCase()) ||
      t.weekStartDate.includes(search);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (id: string) => {
    try {
      await hrReview.mutateAsync({ id, approved: true, comment: '' });
      toast.success('Timesheet HR approved!');
    } catch (e) {
      toast.error(`Failed to approve: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDenyOpen = (id: string) => {
    setSelectedId(id);
    setHrComment('');
    setDenyDialogOpen(true);
  };

  const handleDenyConfirm = async () => {
    try {
      await hrReview.mutateAsync({ id: selectedId, approved: false, comment: hrComment });
      toast.success('Timesheet HR denied.');
      setDenyDialogOpen(false);
    } catch (e) {
      toast.error(`Failed to deny: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Timesheet Review</h1>
        <p className="text-muted-foreground text-sm mt-1">Final approval for manager-approved timesheets</p>
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
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
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
                      Week of {ts.weekStartDate} · {ts.totalHours.toFixed(2)} hrs
                    </p>
                    {ts.managerComment && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Manager: {ts.managerComment}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => handleApprove(ts.id)}
                      disabled={hrReview.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => handleDenyOpen(ts.id)}
                      disabled={hrReview.isPending}
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
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="all">All Statuses</option>
              <option value={TimesheetStatus.submitted}>Submitted</option>
              <option value={TimesheetStatus.managerApproved}>Manager Approved</option>
              <option value={TimesheetStatus.managerDenied}>Manager Denied</option>
              <option value={TimesheetStatus.hrApproved}>HR Approved</option>
              <option value={TimesheetStatus.hrDenied}>HR Denied</option>
            </select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
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
                      Week of {ts.weekStartDate} · {ts.totalHours.toFixed(2)} hrs
                    </p>
                    {ts.managerComment && (
                      <p className="text-xs text-muted-foreground">Manager: {ts.managerComment}</p>
                    )}
                    {ts.hrComment && (
                      <p className="text-xs text-muted-foreground">HR: {ts.hrComment}</p>
                    )}
                  </div>
                  <Badge variant={getStatusBadgeVariant(ts.status)}>
                    {getStatusLabel(ts.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
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
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDenyConfirm}
              disabled={hrReview.isPending || !hrComment.trim()}
            >
              {hrReview.isPending ? 'Denying...' : 'Deny Timesheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
