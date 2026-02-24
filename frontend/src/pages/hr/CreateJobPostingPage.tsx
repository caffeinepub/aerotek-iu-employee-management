import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateJobPosting } from '../../hooks/useQueries';
import { JobPostingStatus } from '../../backend';
import { generateId } from '../../lib/utils';
import { toast } from 'sonner';

export default function CreateJobPostingPage() {
  const navigate = useNavigate();
  const createPosting = useCreateJobPosting();
  const [form, setForm] = useState({
    title: '',
    department: '',
    description: '',
    status: JobPostingStatus.draft as JobPostingStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.department.trim()) e.department = 'Department is required';
    if (!form.description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createPosting.mutateAsync({
        id: generateId(),
        title: form.title.trim(),
        department: form.department.trim(),
        description: form.description.trim(),
        status: form.status,
      });
      toast.success('Job posting created');
      navigate({ to: '/hr/hiring' });
    } catch {
      toast.error('Failed to create job posting');
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/hr/hiring' })}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">Create Job Posting</h1>
          <p className="text-sm text-[oklch(0.52_0.02_250)]">Post a new position</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border border-[oklch(0.88_0.01_240)] shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)]">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Job Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Senior Engineer" className="mt-1 h-9" />
                {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
              </div>
              <div>
                <Label className="text-sm font-medium">Department *</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Engineering" className="mt-1 h-9" />
                {errors.department && <p className="text-xs text-red-600 mt-1">{errors.department}</p>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as JobPostingStatus }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={JobPostingStatus.draft}>Draft</SelectItem>
                  <SelectItem value={JobPostingStatus.open}>Open</SelectItem>
                  <SelectItem value={JobPostingStatus.closed}>Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Description *</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the role, responsibilities, and requirements..." className="mt-1 min-h-32" />
              {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate({ to: '/hr/hiring' })}>Cancel</Button>
              <Button type="submit" disabled={createPosting.isPending} className="bg-[oklch(0.22_0.04_255)] text-white">
                {createPosting.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Posting
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
