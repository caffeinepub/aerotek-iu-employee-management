import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAllJobPostings, useGetAllApplicants } from '../../hooks/useQueries';
import { JobPostingStatus } from '../../backend';
import StatusBadge from '../../components/StatusBadge';

export default function HiringPage() {
  const navigate = useNavigate();
  const { data: postings, isLoading } = useGetAllJobPostings();
  const { data: allApplicants } = useGetAllApplicants();

  const getApplicantCount = (postingId: string) =>
    allApplicants?.filter(a => a.jobPostingId === postingId).length ?? 0;

  const grouped = {
    [JobPostingStatus.open]: postings?.filter(p => p.status === JobPostingStatus.open) ?? [],
    [JobPostingStatus.draft]: postings?.filter(p => p.status === JobPostingStatus.draft) ?? [],
    [JobPostingStatus.closed]: postings?.filter(p => p.status === JobPostingStatus.closed) ?? [],
  };

  const columns = [
    { status: JobPostingStatus.open, label: 'Open', colorClass: 'border-t-blue-500' },
    { status: JobPostingStatus.draft, label: 'Draft', colorClass: 'border-t-purple-500' },
    { status: JobPostingStatus.closed, label: 'Closed', colorClass: 'border-t-gray-400' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">Hiring & Recruitment</h1>
          <p className="text-sm text-[oklch(0.52_0.02_250)] mt-0.5">{postings?.length ?? 0} total job postings</p>
        </div>
        <Button onClick={() => navigate({ to: '/hr/hiring/new' })} className="bg-[oklch(0.22_0.04_255)] hover:bg-[oklch(0.28_0.05_255)] text-white">
          <Plus className="w-4 h-4 mr-2" /> Create Posting
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {columns.map(col => (
            <div key={col.status}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-semibold text-[oklch(0.18_0.04_255)]">{col.label}</h2>
                <span className="bg-[oklch(0.94_0.008_240)] text-[oklch(0.52_0.02_250)] text-xs px-2 py-0.5 rounded-full font-medium">
                  {grouped[col.status].length}
                </span>
              </div>
              <div className="space-y-3">
                {grouped[col.status].length === 0 ? (
                  <div className="bg-white border border-dashed border-[oklch(0.88_0.01_240)] rounded-xl p-6 text-center text-sm text-[oklch(0.52_0.02_250)]">
                    No {col.label.toLowerCase()} postings
                  </div>
                ) : (
                  grouped[col.status].map(posting => (
                    <Card
                      key={posting.id}
                      className={`border border-[oklch(0.88_0.01_240)] shadow-card hover:shadow-elevated transition-shadow cursor-pointer border-t-4 ${col.colorClass}`}
                      onClick={() => navigate({ to: '/hr/hiring/$postingId/pipeline', params: { postingId: posting.id } })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-[oklch(0.18_0.04_255)] text-sm leading-tight">{posting.title}</h3>
                          <StatusBadge status={posting.status} />
                        </div>
                        <p className="text-xs text-[oklch(0.52_0.02_250)] mb-3">{posting.department}</p>
                        <p className="text-xs text-[oklch(0.52_0.02_250)] line-clamp-2 mb-3">{posting.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-[oklch(0.52_0.02_250)]">
                            <Users className="w-3.5 h-3.5" />
                            <span>{getApplicantCount(posting.id)} applicants</span>
                          </div>
                          <span className="text-xs text-[oklch(0.22_0.04_255)] flex items-center gap-1 font-medium">
                            View pipeline <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
