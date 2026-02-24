import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useGetAllEmployees,
  useGetAllPTOPolicies,
  useGetPTOBalance,
  useAddPTOBalance,
  useUpdatePTOBalance,
} from '../../hooks/useQueries';
import { Employee } from '../../backend';
import { toast } from 'sonner';

function EmployeeBalanceRow({
  employee,
  onAdjust,
}: {
  employee: Employee;
  onAdjust: (emp: Employee) => void;
}) {
  const { data: balance, isLoading } = useGetPTOBalance(employee.id);
  return (
    <tr className="border-b border-[oklch(0.94_0.008_240)] last:border-0 hover:bg-[oklch(0.97_0.005_240)]">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[oklch(0.22_0.04_255)] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">{employee.fullName.charAt(0)}</span>
          </div>
          <span className="font-medium text-sm text-[oklch(0.18_0.04_255)]">{employee.fullName}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-[oklch(0.52_0.02_250)]">{employee.department}</td>
      <td className="py-3 px-4 text-sm text-[oklch(0.52_0.02_250)]">
        {isLoading ? <Skeleton className="h-4 w-16" /> : (balance?.policyId ?? '—')}
      </td>
      <td className="py-3 px-4">
        {isLoading ? (
          <Skeleton className="h-6 w-12" />
        ) : balance ? (
          <span className="text-lg font-bold text-[oklch(0.22_0.04_255)]">{balance.balance.toFixed(1)}</span>
        ) : (
          <span className="text-sm text-[oklch(0.65_0.02_250)]">Not set</span>
        )}
      </td>
      <td className="py-3 px-4">
        <Button variant="ghost" size="sm" onClick={() => onAdjust(employee)} className="h-7 px-2">
          <Edit2 className="w-3.5 h-3.5 mr-1" /> Adjust
        </Button>
      </td>
    </tr>
  );
}

export default function PTOBalancesPage() {
  const navigate = useNavigate();
  const { data: employees, isLoading: empLoading } = useGetAllEmployees();
  const { data: policies } = useGetAllPTOPolicies();
  const addBalance = useAddPTOBalance();
  const updateBalance = useUpdatePTOBalance();

  const [adjustModal, setAdjustModal] = useState<Employee | null>(null);
  const [adjustForm, setAdjustForm] = useState({ balance: '', policyId: '', reason: '' });

  const openAdjust = (emp: Employee) => {
    setAdjustModal(emp);
    setAdjustForm({ balance: '', policyId: '', reason: '' });
  };

  const handleAdjust = async () => {
    if (!adjustModal) return;
    if (!adjustForm.balance || isNaN(Number(adjustForm.balance))) {
      toast.error('Please enter a valid balance');
      return;
    }
    if (!adjustForm.reason.trim()) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }
    if (!adjustForm.policyId) {
      toast.error('Please select a policy');
      return;
    }
    const balanceObj = {
      employeeId: adjustModal.id,
      policyId: adjustForm.policyId,
      balance: Number(adjustForm.balance),
    };
    try {
      try {
        await updateBalance.mutateAsync(balanceObj);
      } catch {
        await addBalance.mutateAsync(balanceObj);
      }
      toast.success('PTO balance updated');
      setAdjustModal(null);
    } catch {
      toast.error('Failed to update PTO balance');
    }
  };

  const isPending = addBalance.isPending || updateBalance.isPending;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/hr/pto-policies' })}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">PTO Balances</h1>
          <p className="text-sm text-[oklch(0.52_0.02_250)]">View and adjust employee PTO balances</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[oklch(0.88_0.01_240)] shadow-card overflow-hidden">
        {empLoading ? (
          <div className="p-4 space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[oklch(0.97_0.005_240)] border-b border-[oklch(0.88_0.01_240)]">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Employee</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Policy</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Balance (days)</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees?.map(emp => (
                <EmployeeBalanceRow key={emp.id} employee={emp} onAdjust={openAdjust} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!adjustModal} onOpenChange={open => { if (!open) setAdjustModal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust PTO Balance — {adjustModal?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Policy *</Label>
              <Select value={adjustForm.policyId} onValueChange={v => setAdjustForm(f => ({ ...f, policyId: v }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select policy" /></SelectTrigger>
                <SelectContent>
                  {policies?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">New Balance (days) *</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={adjustForm.balance}
                onChange={e => setAdjustForm(f => ({ ...f, balance: e.target.value }))}
                placeholder="e.g. 15.5"
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Reason for Adjustment *</Label>
              <Input
                value={adjustForm.reason}
                onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Annual reset, correction, etc."
                className="mt-1 h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModal(null)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={isPending} className="bg-[oklch(0.22_0.04_255)] text-white">
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
