import React, { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Plus, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetApplicantsForPosting, useAddApplicant, useUpdateApplicantStage } from '../../hooks/useQueries';
import { ApplicantStage } from '../../backend';
import StatusBadge from '../../components/StatusBadge';
import { generateId, formatDate } from '../../lib/utils';
import { toast } from 'sonner';

const STAGES = [
  { key: ApplicantStage.applied, label: 'Applied', color: 'border-t-blue-400' },
  { key: ApplicantStage.screening, label: 'Screening', color: 'border-t-indigo-400' },
  { key: ApplicantStage.interview, label: 'Interview', color: 'border-t-violet-400' },
  { key: ApplicantStage.offer, label: 'Offer', color: 'border-t-orange-400' },
  { key: ApplicantStage.hired, label: 'Hired', color: 'border-t-emerald-500' },
  { key: ApplicantStage.rejected, label: 'Rejected', color: 'border-t-red-400' },
];

export default function ApplicantPipelinePage() {
  const { postingId } = useParams({ strict: false }) as { postingId: string };
  const navigate = useNavigate();
  const { data: applicants, isLoading } = useGetApplicantsForPosting(postingId);
  const addApplicant = useAddApplicant();
  const updateStage = useUpdateApplicantStage();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newApplicant, setNewApplicant] = useState({ name: '', contact: '', resumeNotes: '' });
  const [movingId, setMovingId] = useState<string | null>(null);

  const handleAddApplicant = async () => {
    if (!newApplicant.name.trim()) { toast.error('Name is required'); return; }
    try {
      await addApplicant.mutateAsync({
        id: generateId(),
        name: newApplicant.name.trim(),
        contact: newApplicant.contact.trim(),
        resumeNotes: newApplicant.resumeNotes.trim(),
        appliedDate: BigInt(Date.now()) * BigInt(1_000_000),
        stage: ApplicantStage.applied,
        jobPostingId: postingId,
      });
      toast.success('Applicant added');
      setShowAddModal(false);
      setNewApplicant({ name: '', contact: '', resumeNotes: '' });
    } catch { toast.error('Failed to add applicant'); }
  };

  const handleMoveStage = async (applicantId: string, stage: ApplicantStage) => {
    setMovingId(applicantId);
    try {
      await updateStage.mutateAsync({ id: applicantId, stage });
      toast.success('Stage updated');
    } catch { toast.error('Failed to update stage'); }
    finally { setMovingId(null); }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/hr/hiring' })}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">Applicant Pipeline</h1>
            <p className="text-sm text-[oklch(0.52_0.02_250)]">Posting ID: {postingId}</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-[oklch(0.22_0.04_255)] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Applicant
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {STAGES.map(stage => {
            const stageApplicants = applicants?.filter(a => a.stage === stage.key) ?? [];
            return (
              <div key={stage.key} className="min-w-36">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-xs font-semibold text-[oklch(0.35_0.02_250)] uppercase tracking-wide">{stage.label}</span>
                  <span className="text-xs bg-[oklch(0.94_0.008_240)] text-[oklch(0.52_0.02_250)] px-1.5 py-0.5 rounded-full">{stageApplicants.length}</span>
                </div>
                <div className="space-y-2">
                  {stageApplicants.length === 0 ? (
                    <div className="bg-[oklch(0.97_0.005_240)] border border-dashed border-[oklch(0.88_0.01_240)] rounded-lg p-3 text-center text-xs text-[oklch(0.65_0.02_250)]">
                      Empty
                    </div>
                  ) : (
                    stageApplicants.map(applicant => (
                      <Card key={applicant.id} className={`border border-[oklch(0.88_0.01_240)] shadow-xs border-t-4 ${stage.color}`}>
                        <CardContent className="p-3">
                          <p className="font-medium text-xs text-[oklch(0.18_0.04_255)] mb-1">{applicant.name}</p>
                          <p className="text-xs text-[oklch(0.52_0.02_250)] mb-2">{applicant.contact}</p>
                          <p className="text-xs text-[oklch(0.65_0.02_250)] mb-2 line-clamp-2">{applicant.resumeNotes}</p>
                          <Select
                            value={applicant.stage}
                            onValueChange={v => handleMoveStage(applicant.id, v as ApplicantStage)}
                            disabled={movingId === applicant.id}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STAGES.map(s => <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Applicant</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Name *</Label>
              <Input value={newApplicant.name} onChange={e => setNewApplicant(a => ({ ...a, name: e.target.value }))} placeholder="Jane Smith" className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-sm">Contact (Email/Phone)</Label>
              <Input value={newApplicant.contact} onChange={e => setNewApplicant(a => ({ ...a, contact: e.target.value }))} placeholder="jane@email.com" className="mt-1 h-9" />
            </div>
            <div>
              <Label className="text-sm">Resume Notes</Label>
              <Textarea value={newApplicant.resumeNotes} onChange={e => setNewApplicant(a => ({ ...a, resumeNotes: e.target.value }))} placeholder="Key qualifications, experience..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddApplicant} disabled={addApplicant.isPending} className="bg-[oklch(0.22_0.04_255)] text-white">
              {addApplicant.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add Applicant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
