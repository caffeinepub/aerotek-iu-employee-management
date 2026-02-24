import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '../../contexts/AuthContext';
import { useGetTimeOffRequestsForEmployee, useSubmitTimeOffRequest } from '../../hooks/useQueries';
import { TimeOffStatus } from '../../backend';
import StatusBadge from '../../components/StatusBadge';
import { formatDate, generateId } from '../../lib/utils';
import { toast } from 'sonner';

const TIME_OFF_TYPES = ['Vacation', 'Sick Leave', 'Personal', 'Bereavement', 'Other'];

export default function EmployeeTimeOffPage() {
  const { session } = useAuthContext();
  const employeeId = session?.employeeId ?? '';
  const { data: requests, isLoading } = useGetTimeOffRequestsForEmployee(employeeId);
  const submitRequest = useSubmitTimeOffRequest();

  const [form, setForm] = useState({ type: '', startDate: '', endDate: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pending = requests?.filter(r => r.status === TimeOffStatus.pending) ?? [];
  const approved = requests?.filter(r => r.status === TimeOffStatus.approved) ?? [];
  const denied = requests?.filter(r => r.status === TimeOffStatus.denied) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type || !form.startDate || !form.endDate) {
      toast.error('Please fill all required fields'); return;
    }
    if (!employeeId) {
      toast.error('Your account is not linked to an employee profile. Please contact HR.'); return;
    }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) { toast.error('End date must be after start date'); return; }
    setIsSubmitting(true);
    try {
      await submitRequest.mutateAsync({
        id: generateId(),
        employeeId,
        timeOffType: form.type,
        startDate: BigInt(start.getTime()) * BigInt(1_000_000),
        endDate: BigInt(end.getTime()) * BigInt(1_000_000),
        requestDate: BigInt(Date.now()) * BigInt(1_000_000),
        status: TimeOffStatus.pending,
        approverComments: undefined,
      });
      toast.success('Time off request submitted successfully');
      setForm({ type: '', startDate: '', endDate: '', notes: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('No employee record')) {
        toast.error('Your account is not linked to an employee profile. Please contact HR.');
      } else {
        toast.error('Failed to submit request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">Time Off</h1>
        <p className="text-sm text-[oklch(0.52_0.02_250)] mt-0.5">Submit and track your time off requests</p>
      </div>

      {!employeeId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Your account is not linked to an employee profile. Please contact HR to link your account before submitting time off requests.
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', count: pending.length, color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Approved', count: approved.length, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { label: 'Denied', count: denied.length, color: 'text-red-600 bg-red-50 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Card className="border border-[oklch(0.88_0.01_240)] shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)] flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{TIME_OFF_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Start Date *</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-sm font-medium">End Date *</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="mt-1 h-9" />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." className="mt-1" rows={2} />
            </div>
            <Button type="submit" disabled={isSubmitting || !employeeId} className="bg-[oklch(0.22_0.04_255)] text-white">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-[oklch(0.88_0.01_240)] shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)]">Request History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !requests?.length ? (
            <p className="text-sm text-[oklch(0.52_0.02_250)] py-4 text-center">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {[...requests].sort((a, b) => Number(b.requestDate) - Number(a.requestDate)).map(req => (
                <div key={req.id} className="flex items-center justify-between py-2.5 border-b border-[oklch(0.94_0.008_240)] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[oklch(0.18_0.04_255)]">{req.timeOffType}</p>
                    <p className="text-xs text-[oklch(0.52_0.02_250)]">{formatDate(req.startDate)} – {formatDate(req.endDate)}</p>
                    {req.approverComments && (
                      <p className="text-xs text-[oklch(0.52_0.02_250)] italic mt-0.5">"{req.approverComments}"</p>
                    )}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
