import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  useGetEmployee,
  useUpdateEmployee,
  useDeactivateEmployee,
  useDeleteEmployee,
  useGetAllEmployees,
} from '../../hooks/useQueries';
import { Employee, Role, EmployeeStatus } from '../../backend';
import { useAuthContext } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Save, X, UserX, Trash2 } from 'lucide-react';

function getStatusBadgeVariant(status: EmployeeStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case EmployeeStatus.active: return 'default';
    case EmployeeStatus.inactive: return 'secondary';
    case EmployeeStatus.terminated: return 'destructive';
    default: return 'outline';
  }
}

export default function EmployeeDetailPage() {
  const params = useParams({ from: '/hr/employees/$id' });
  const id = params.id;
  const navigate = useNavigate();
  const { session } = useAuthContext();

  const { data: employee, isLoading } = useGetEmployee(id);
  const { data: allEmployees = [] } = useGetAllEmployees();
  const updateEmployee = useUpdateEmployee();
  const deactivateEmployee = useDeactivateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Employee>>({});

  const isHRAdmin = session?.role === Role.hrAdmin;

  const managers = allEmployees.filter(
    (e: Employee) => e.role === Role.manager || e.role === Role.hrAdmin
  );

  const handleEdit = () => {
    if (employee) {
      setForm({ ...employee });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setForm({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!employee || !form.fullName) return;
    try {
      const updated: Employee = {
        ...employee,
        ...form,
        directManagerId: form.directManagerId || undefined,
      } as Employee;
      await updateEmployee.mutateAsync({ id, profile: updated });
      toast.success('Employee updated successfully!');
      setIsEditing(false);
    } catch (e) {
      toast.error(`Failed to update: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateEmployee.mutateAsync(id);
      toast.success('Employee deactivated.');
    } catch (e) {
      toast.error(`Failed to deactivate: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success('Employee deleted.');
      navigate({ to: '/hr/employees' });
    } catch (e) {
      toast.error(`Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Employee not found.</p>
        <Button variant="outline" onClick={() => navigate({ to: '/hr/employees' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>
      </div>
    );
  }

  const managerName = employee.directManagerId
    ? allEmployees.find((e: Employee) => e.id === employee.directManagerId)?.fullName ?? employee.directManagerId
    : '—';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/hr/employees' })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{employee.fullName}</h1>
          <p className="text-muted-foreground text-sm">{employee.jobTitle} · {employee.department}</p>
        </div>
        <Badge variant={getStatusBadgeVariant(employee.status)}>
          {employee.status}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employee Details</CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateEmployee.isPending}>
                {updateEmployee.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isEditing ? (
            <>
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input
                  value={form.fullName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={form.email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input
                  value={form.department ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Job Title</Label>
                <Input
                  value={form.jobTitle ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Badge ID</Label>
                <Input
                  value={form.badgeId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, badgeId: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Direct Manager</Label>
                <Select
                  value={form.directManagerId ?? '__none__'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, directManagerId: v === '__none__' ? undefined : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Manager</SelectItem>
                    {managers.map((m: Employee) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Full Name</p>
                <p className="text-sm font-medium">{employee.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{employee.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{employee.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium">{employee.department || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Title</p>
                <p className="text-sm font-medium">{employee.jobTitle || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Badge ID</p>
                <p className="text-sm font-medium">{employee.badgeId || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Direct Manager</p>
                <p className="text-sm font-medium">{managerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium capitalize">{employee.role}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isHRAdmin && (
        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50">
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate Employee?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will set {employee.fullName}'s status to inactive. They will no longer be able to log in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate}>Deactivate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Employee
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {employee.fullName}'s record. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
