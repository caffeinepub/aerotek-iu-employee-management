import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Plus, Users, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGetAllEmployees, useDeleteEmployee } from '../../hooks/useQueries';
import { EmployeeStatus } from '../../backend';
import { useAuthContext } from '../../contexts/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { isHrAdmin } = useAuthContext();
  const { data: employees, isLoading } = useGetAllEmployees();
  const deleteEmployee = useDeleteEmployee();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const departments = Array.from(new Set(employees?.map(e => e.department).filter(Boolean) ?? []));

  const filtered = employees?.filter(emp => {
    const matchSearch = !search ||
      emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || emp.department === deptFilter;
    const matchStatus = statusFilter === 'all' || emp.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  }) ?? [];

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.name} has been removed.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete employee';
      toast.error(msg);
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">Employees</h1>
          <p className="text-sm text-[oklch(0.52_0.02_250)] mt-0.5">{employees?.length ?? 0} total employees</p>
        </div>
        <Button onClick={() => navigate({ to: '/hr/employees/new' })} className="bg-[oklch(0.22_0.04_255)] hover:bg-[oklch(0.28_0.05_255)] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Employee
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-[oklch(0.88_0.01_240)] shadow-xs">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.52_0.02_250)]" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={EmployeeStatus.active}>Active</SelectItem>
            <SelectItem value={EmployeeStatus.inactive}>Inactive</SelectItem>
            <SelectItem value={EmployeeStatus.terminated}>Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-[oklch(0.88_0.01_240)] shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[oklch(0.52_0.02_250)]">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No employees found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new employee</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[oklch(0.97_0.005_240)] border-b border-[oklch(0.88_0.01_240)]">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Name</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Department</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Job Title</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Start Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Role</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Status</th>
                {isHrAdmin && (
                  <th className="text-left py-3 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr
                  key={emp.id}
                  className={`border-b border-[oklch(0.94_0.008_240)] last:border-0 hover:bg-[oklch(0.97_0.005_240)] transition-colors ${i % 2 === 1 ? 'bg-[oklch(0.985_0.003_240)]' : ''}`}
                >
                  <td
                    className="py-3 px-4 cursor-pointer"
                    onClick={() => navigate({ to: '/hr/employees/$id', params: { id: emp.id } })}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[oklch(0.22_0.04_255)] flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">{emp.fullName.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-[oklch(0.18_0.04_255)]">{emp.fullName}</p>
                        <p className="text-xs text-[oklch(0.52_0.02_250)]">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td
                    className="py-3 px-4 text-[oklch(0.35_0.02_250)] cursor-pointer"
                    onClick={() => navigate({ to: '/hr/employees/$id', params: { id: emp.id } })}
                  >{emp.department}</td>
                  <td
                    className="py-3 px-4 text-[oklch(0.35_0.02_250)] cursor-pointer"
                    onClick={() => navigate({ to: '/hr/employees/$id', params: { id: emp.id } })}
                  >{emp.jobTitle}</td>
                  <td
                    className="py-3 px-4 text-[oklch(0.52_0.02_250)] cursor-pointer"
                    onClick={() => navigate({ to: '/hr/employees/$id', params: { id: emp.id } })}
                  >{formatDate(emp.startDate)}</td>
                  <td
                    className="py-3 px-4 cursor-pointer"
                    onClick={() => navigate({ to: '/hr/employees/$id', params: { id: emp.id } })}
                  ><StatusBadge status={emp.role} /></td>
                  <td
                    className="py-3 px-4 cursor-pointer"
                    onClick={() => navigate({ to: '/hr/employees/$id', params: { id: emp.id } })}
                  ><StatusBadge status={emp.status} /></td>
                  {isHrAdmin && (
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTarget({ id: emp.id, name: emp.fullName });
                        }}
                        disabled={deleteEmployee.isPending && deleteTarget?.id === emp.id}
                      >
                        {deleteEmployee.isPending && deleteTarget?.id === emp.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span className="ml-1 text-xs">Delete</span>
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEmployee.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteEmployee.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteEmployee.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
              ) : (
                'Delete Employee'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
