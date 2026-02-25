import React, { useState } from 'react';
import { useTimesheets, useHrReviewTimesheet } from '../../hooks/useQueries';
import { Timesheet, TimesheetStatus } from '../../backend';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, ClipboardList, Search } from 'lucide-react';
import { toast } from 'sonner';

function getStatusBadge(status: TimesheetStatus) {
  switch (status) {
    case TimesheetStatus.submitted:
      return <Badge variant="secondary">Submitted</Badge>;
    case TimesheetStatus.managerApproved:
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Manager Approved</Badge>;
    case TimesheetStatus.managerDenied:
      return <Badge variant="destructive">Manager Denied</Badge>;
    case TimesheetStatus.hrApproved:
      return <Badge className="bg-green-100 text-green-800 border-green-200">HR Approved</Badge>;
    case TimesheetStatus.hrDenied:
      return <Badge variant="destructive">HR Denied</Badge>;
    default:
      return <Badge variant="outline">{String(status)}</Badge>;
  }
}

export default function HRTimesheetPage() {
  const { data: timesheets, isLoading } = useTimesheets();
  const hrReviewMutation = useHrReviewTimesheet();

  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [denyComment, setDenyComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const pendingHRTimesheets = (timesheets || []).filter(
    (ts) => ts.status === TimesheetStatus.managerApproved
  );

  const allTimesheets = (timesheets || []).filter((ts) => {
    const matchesSearch =
      !searchQuery ||
      ts.employeeUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ts.weekStartDate.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || ts.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (ts: Timesheet) => {
    try {
      await hrReviewMutation.mutateAsync({ id: ts.id, approved: true, comment: '' });
      toast.success(`Timesheet for ${ts.employeeUsername} approved.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve timesheet');
    }
  };

  const handleDenyOpen = (ts: Timesheet) => {
    setSelectedTimesheet(ts);
    setDenyComment('');
    setDenyDialogOpen(true);
  };

  const handleDenyConfirm = async () => {
    if (!selectedTimesheet) return;
    if (!denyComment.trim()) {
      toast.error('Please provide a reason for denial.');
      return;
    }
    try {
      await hrReviewMutation.mutateAsync({
        id: selectedTimesheet.id,
        approved: false,
        comment: denyComment,
      });
      toast.success('Timesheet denied.');
      setDenyDialogOpen(false);
      setSelectedTimesheet(null);
      setDenyComment('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to deny timesheet');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Timesheet Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Final approval for employee timesheets</p>
      </div>

      {/* Pending HR Approval */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Pending HR Approval
          {pendingHRTimesheets.length > 0 && (
            <Badge variant="secondary">{pendingHRTimesheets.length}</Badge>
          )}
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : pendingHRTimesheets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No timesheets pending HR approval.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingHRTimesheets.map((ts) => (
              <Card key={ts.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{ts.employeeUsername}</CardTitle>
                    {getStatusBadge(ts.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Week of {ts.weekStartDate} · {ts.totalHours}h total
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 mb-4">
                    {ts.entries.map((entry) => (
                      <div key={entry.date} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{entry.date}</span>
                        <span>{entry.startTime} – {entry.endTime}</span>
                        <span className="font-medium">{entry.hoursWorked}h</span>
                      </div>
                    ))}
                  </div>
                  {ts.managerComment && (
                    <div className="mb-3 p-2 bg-muted rounded text-sm">
                      <span className="font-medium">Manager: </span>
                      {ts.managerComment}
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => handleDenyOpen(ts)}
                      disabled={hrReviewMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Deny
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => handleApprove(ts)}
                      disabled={hrReviewMutation.isPending}
                    >
                      {hrReviewMutation.isPending ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Final Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All Timesheets */}
      <div>
        <h2 className="text-lg font-semibold mb-3">All Timesheets</h2>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee or week..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={TimesheetStatus.submitted}>Submitted</SelectItem>
              <SelectItem value={TimesheetStatus.managerApproved}>Manager Approved</SelectItem>
              <SelectItem value={TimesheetStatus.managerDenied}>Manager Denied</SelectItem>
              <SelectItem value={TimesheetStatus.hrApproved}>HR Approved</SelectItem>
              <SelectItem value={TimesheetStatus.hrDenied}>HR Denied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : allTimesheets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No timesheets found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allTimesheets
              .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate))
              .map((ts) => (
                <Card key={ts.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{ts.employeeUsername}</p>
                        <p className="text-xs text-muted-foreground">
                          Week of {ts.weekStartDate} · {ts.totalHours}h
                        </p>
                      </div>
                      {getStatusBadge(ts.status)}
                    </div>
                    {ts.hrComment && (
                      <p className="text-xs text-muted-foreground mt-1 italic">HR: "{ts.hrComment}"</p>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Timesheet (HR)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for the final denial of this timesheet.
            </p>
            <div>
              <Label htmlFor="hr-deny-comment">Reason</Label>
              <Textarea
                id="hr-deny-comment"
                value={denyComment}
                onChange={(e) => setDenyComment(e.target.value)}
                placeholder="Enter reason for denial..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDenyConfirm}
              disabled={hrReviewMutation.isPending || !denyComment.trim()}
            >
              {hrReviewMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : null}
              Deny Timesheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
