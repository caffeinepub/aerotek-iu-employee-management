import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import {
  useGetEmployee,
  useUpdateEmployee,
  useDeactivateEmployee,
  useDeleteEmployee,
  useGetEmployeesByRole,
} from '../../hooks/useQueries';
import { Employee, Role, EmployeeStatus } from '../../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { ArrowLeft, Edit, Save, X, Trash2, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';

export default function EmployeeDetailPage() {
  const { id } = useParams({ from: '/hr/employees/$id' });
  const navigate = useNavigate();
  const { session } = useAuth();
  const isHRAdmin = session?.role === 'hrAdmin';

  const { data: employee, isLoading } = useGetEmployee(id);
  const { data: managers = [] } = useGetEmployeesByRole(Role.manager);
  const updateEmployee = useUpdateEmployee();
  const deactivateEmployee = useDeactivateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee & { directManagerId: string }>>({});

  function startEdit() {
    if (!employee) return;
    setEditForm({
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      jobTitle: employee.jobTitle,
      role: employee.role,
      status: employee.status,
      badgeId: employee.badgeId,
      directManagerId: employee.directManagerId ?? '',
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditForm({});
  }

  async function handleSave() {
    if (!employee) return;

    const isManagerRole = editForm.role === Role.manager || editForm.role === Role.hrAdmin;
    if (!isManagerRole && !editForm.directManagerId) {
      toast.error('Please select a direct manager');
      return;
    }

    const updated: Employee = {
      ...employee,
      fullName: editForm.fullName ?? employee.fullName,
      email: editForm.email ?? employee.email,
      phone: editForm.phone ?? employee.phone,
      department: editForm.department ?? employee.department,
      jobTitle: editForm.jobTitle ?? employee.jobTitle,
      role: editForm.role ?? employee.role,
      status: editForm.status ?? employee.status,
      badgeId: editForm.badgeId ?? employee.badgeId,
      directManagerId: isManagerRole ? 'HR' : (editForm.directManagerId ?? employee.directManagerId),
    };

    try {
      await updateEmployee.mutateAsync({ id, profile: updated });
      toast.success('Employee updated successfully');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleDeactivate() {
    try {
      await deactivateEmployee.mutateAsync(id);
      toast.success('Employee deactivated');
    } catch (err) {
      toast.error('Failed to deactivate employee');
    }
  }

  async function handleDelete() {
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success('Employee deleted');
      navigate({ to: '/hr/employees' });
    } catch (err) {
      toast.error('Failed to delete: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  function getStatusColor(status: EmployeeStatus) {
    switch (status) {
      case EmployeeStatus.active: return 'default';
      case EmployeeStatus.inactive: return 'secondary';
      case EmployeeStatus.terminated: return 'destructive';
      default: return 'outline';
    }
  }

  function getRoleLabel(role: Role) {
    switch (role) {
      case Role.hrAdmin: return 'HR Admin';
      case Role.manager: return 'Manager';
      case Role.supervisor: return 'Supervisor';
      case Role.employee: return 'Employee';
      default: return role;
    }
  }

  function getManagerName(managerId?: string): string {
    if (!managerId || managerId === 'HR' || managerId === 'UNASSIGNED') {
      return managerId === 'HR' ? 'Human Resources' : managerId === 'UNASSIGNED' ? 'Unassigned' : '—';
    }
    const mgr = managers.find(m => m.id === managerId);
    return mgr ? mgr.fullName : managerId;
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Employee not found.</p>
        <Button variant="link" onClick={() => navigate({ to: '/hr/employees' })}>Back to Employees</Button>
      </div>
    );
  }

  const isManagerRole = (editForm.role ?? employee.role) === Role.manager || (editForm.role ?? employee.role) === Role.hrAdmin;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/hr/employees' })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{employee.fullName}</h1>
            <p className="text-muted-foreground text-sm">{employee.jobTitle} · {employee.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateEmployee.isPending}>
                {updateEmployee.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Save
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Employee Details
            <Badge variant={getStatusColor(employee.status)}>{employee.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input value={editForm.fullName ?? ''} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={editForm.email ?? ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={editForm.phone ?? ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input value={editForm.department ?? ''} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Job Title</Label>
                <Input value={editForm.jobTitle ?? ''} onChange={e => setEditForm(p => ({ ...p, jobTitle: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v as Role, directManagerId: '' }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Role.employee}>Employee</SelectItem>
                    <SelectItem value={Role.manager}>Manager</SelectItem>
                    <SelectItem value={Role.supervisor}>Supervisor</SelectItem>
                    <SelectItem value={Role.hrAdmin}>HR Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v as EmployeeStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EmployeeStatus.active}>Active</SelectItem>
                    <SelectItem value={EmployeeStatus.inactive}>Inactive</SelectItem>
                    <SelectItem value={EmployeeStatus.terminated}>Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Badge ID</Label>
                <Input value={editForm.badgeId ?? ''} onChange={e => setEditForm(p => ({ ...p, badgeId: e.target.value }))} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Direct Manager *</Label>
                {isManagerRole ? (
                  <Input value="Human Resources" disabled className="bg-muted" />
                ) : (
                  <Select value={editForm.directManagerId ?? ''} onValueChange={v => setEditForm(p => ({ ...p, directManagerId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select direct manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map(mgr => (
                        <SelectItem key={mgr.id} value={mgr.id}>{mgr.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Employee ID</p>
                <p className="font-medium">{employee.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Full Name</p>
                <p className="font-medium">{employee.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Email</p>
                <p className="font-medium">{employee.email || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Phone</p>
                <p className="font-medium">{employee.phone || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Department</p>
                <p className="font-medium">{employee.department}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Job Title</p>
                <p className="font-medium">{employee.jobTitle}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Role</p>
                <p className="font-medium">{getRoleLabel(employee.role)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">Direct Manager</p>
                <p className="font-medium">{getManagerName(employee.directManagerId)}</p>
              </div>
              {employee.badgeId && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Badge ID
                  </p>
                  <p className="font-medium font-mono">{employee.badgeId}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isHRAdmin && (
        <div className="flex justify-end gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={deactivateEmployee.isPending}>
                {deactivateEmployee.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
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
              <Button variant="destructive" size="sm" disabled={deleteEmployee.isPending}>
                {deleteEmployee.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete Employee
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {employee.fullName} and all associated data. This action cannot be undone.
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
