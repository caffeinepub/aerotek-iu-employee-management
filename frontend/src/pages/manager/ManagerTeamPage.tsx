import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetAllEmployees } from '../../hooks/useQueries';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../lib/utils';

export default function ManagerTeamPage() {
  const { data: employees, isLoading } = useGetAllEmployees();
  const [search, setSearch] = useState('');

  const filtered = employees?.filter(emp =>
    !search ||
    emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
    emp.department.toLowerCase().includes(search.toLowerCase()) ||
    emp.jobTitle.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">Team Directory</h1>
        <p className="text-sm text-[oklch(0.52_0.02_250)] mt-0.5">{employees?.length ?? 0} team members</p>
      </div>

      <div className="bg-white p-3 rounded-xl border border-[oklch(0.88_0.01_240)] shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.52_0.02_250)]" />
          <Input
            placeholder="Search team members..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[oklch(0.88_0.01_240)] shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[oklch(0.52_0.02_250)]">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No team members found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[oklch(0.97_0.005_240)] border-b border-[oklch(0.88_0.01_240)]">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Job Title</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Start Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr key={emp.id} className={`border-b border-[oklch(0.94_0.008_240)] last:border-0 ${i % 2 === 1 ? 'bg-[oklch(0.985_0.003_240)]' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[oklch(0.55_0.18_255)] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">{emp.fullName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-[oklch(0.18_0.04_255)]">{emp.fullName}</p>
                        <p className="text-xs text-[oklch(0.52_0.02_250)]">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[oklch(0.35_0.02_250)]">{emp.department}</td>
                  <td className="py-3 px-4 text-[oklch(0.35_0.02_250)]">{emp.jobTitle}</td>
                  <td className="py-3 px-4 text-[oklch(0.52_0.02_250)]">{formatDate(emp.startDate)}</td>
                  <td className="py-3 px-4"><StatusBadge status={emp.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
