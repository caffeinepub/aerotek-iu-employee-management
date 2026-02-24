import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetAllPTOPolicies, useAddPTOPolicy, useUpdatePTOPolicy } from '../../hooks/useQueries';
import { generateId } from '../../lib/utils';
import { toast } from 'sonner';

export default function PTOPolicyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false }) as { id?: string };
  const isEdit = !!id;

  const { data: policies } = useGetAllPTOPolicies();
  const addPolicy = useAddPTOPolicy();
  const updatePolicy = useUpdatePTOPolicy();

  const [form, setForm] = useState({
    name: '',
    accrualRate: '',
    maxCarryOver: '',
    leaveTypeInput: '',
    eligibleLeaveTypes: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit && policies) {
      const policy = policies.find(p => p.id === id);
      if (policy) {
        setForm({
          name: policy.name,
          accrualRate: String(policy.accrualRate),
          maxCarryOver: String(policy.maxCarryOver),
          leaveTypeInput: '',
          eligibleLeaveTypes: [...policy.eligibleLeaveTypes],
        });
      }
    }
  }, [isEdit, id, policies]);

  const addLeaveType = () => {
    const t = form.leaveTypeInput.trim();
    if (t && !form.eligibleLeaveTypes.includes(t)) {
      setForm(f => ({ ...f, eligibleLeaveTypes: [...f.eligibleLeaveTypes, t], leaveTypeInput: '' }));
    }
  };

  const removeLeaveType = (type: string) => {
    setForm(f => ({ ...f, eligibleLeaveTypes: f.eligibleLeaveTypes.filter(t => t !== type) }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Policy name is required';
    if (!form.accrualRate || isNaN(Number(form.accrualRate))) e.accrualRate = 'Valid accrual rate required';
    if (!form.maxCarryOver || isNaN(Number(form.maxCarryOver))) e.maxCarryOver = 'Valid max carry-over required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const policy = {
      id: isEdit ? id! : generateId(),
      name: form.name.trim(),
      accrualRate: Number(form.accrualRate),
      maxCarryOver: Number(form.maxCarryOver),
      eligibleLeaveTypes: form.eligibleLeaveTypes,
    };
    try {
      if (isEdit) {
        await updatePolicy.mutateAsync(policy);
        toast.success('Policy updated');
      } else {
        await addPolicy.mutateAsync(policy);
        toast.success('Policy created');
      }
      navigate({ to: '/hr/pto-policies' });
    } catch {
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} policy`);
    }
  };

  const isPending = addPolicy.isPending || updatePolicy.isPending;

  return (
    <div className="p-6 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/hr/pto-policies' })}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">{isEdit ? 'Edit' : 'Create'} PTO Policy</h1>
          <p className="text-sm text-[oklch(0.52_0.02_250)]">{isEdit ? 'Update policy details' : 'Define a new PTO policy'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border border-[oklch(0.88_0.01_240)] shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)]">Policy Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Policy Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Standard PTO Policy"
                className="mt-1 h-9"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Accrual Rate (days/period) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.accrualRate}
                  onChange={e => setForm(f => ({ ...f, accrualRate: e.target.value }))}
                  placeholder="1.5"
                  className="mt-1 h-9"
                />
                {errors.accrualRate && <p className="text-xs text-red-600 mt-1">{errors.accrualRate}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium">Max Carry-Over (days) *</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={form.maxCarryOver}
                  onChange={e => setForm(f => ({ ...f, maxCarryOver: e.target.value }))}
                  placeholder="10"
                  className="mt-1 h-9"
                />
                {errors.maxCarryOver && <p className="text-xs text-red-600 mt-1">{errors.maxCarryOver}</p>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Eligible Leave Types</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.leaveTypeInput}
                  onChange={e => setForm(f => ({ ...f, leaveTypeInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLeaveType(); } }}
                  placeholder="e.g. Vacation, Sick, Personal"
                  className="h-9 flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addLeaveType} className="h-9">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.eligibleLeaveTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.eligibleLeaveTypes.map(type => (
                    <span key={type} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                      {type}
                      <button type="button" onClick={() => removeLeaveType(type)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/hr/pto-policies' })}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-[oklch(0.22_0.04_255)] text-white">
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isEdit ? 'Update Policy' : 'Create Policy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
