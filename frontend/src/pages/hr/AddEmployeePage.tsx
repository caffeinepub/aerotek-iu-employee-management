import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateEmployee, useGetEmployeesByRole } from '../../hooks/useQueries';
import { Employee, Role, EmployeeStatus } from '../../backend';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const createEmployee = useCreateEmployee();
  const { data: managers = [], isLoading: managersLoading } = useGetEmployeesByRole(Role.manager);

  const [form, setForm] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    department: '',
    jobTitle: '',
    role: Role.employee,
    badgeId: '',
    username: '',
    password: '',
    confirmPassword: '',
    directManagerId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!form.id.trim()) newErrors.id = 'Employee ID is required';
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    if (!form.department.trim()) newErrors.department = 'Department is required';
    if (!form.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
    if (!form.username.trim()) newErrors.username = 'Username is required';
    if (!form.password.trim()) newErrors.password = 'Password is required';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    // Direct manager required for non-manager/non-hrAdmin roles
    const needsManager = form.role !== Role.manager && form.role !== Role.hrAdmin;
    if (needsManager && !form.directManagerId) {
      newErrors.directManagerId = 'Direct manager is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const isManagerOrHR = form.role === Role.manager || form.role === Role.hrAdmin;
    const resolvedManagerId: string | undefined = isManagerOrHR
      ? undefined
      : form.directManagerId || undefined;

    const profile: Employee = {
      id: form.id.trim(),
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department: form.department.trim(),
      jobTitle: form.jobTitle.trim(),
      startDate: BigInt(Date.now()) * BigInt(1_000_000),
      role: form.role,
      status: EmployeeStatus.active,
      badgeId: form.badgeId.trim(),
      directManagerId: resolvedManagerId,
    };

    try {
      await createEmployee.mutateAsync({
        profile,
        username: form.username.trim(),
        passwordHash: form.password,
        displayName: form.fullName.trim(),
        directManagerId: resolvedManagerId,
      });
      toast.success('Employee created successfully');
      navigate({ to: '/hr/employees' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Failed to create employee: ' + msg);
    }
  }

  const isManagerRole = form.role === Role.manager || form.role === Role.hrAdmin;
  const activeManagers = managers.filter(m => m.status === EmployeeStatus.active);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/hr/employees' })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Employee</h1>
          <p className="text-muted-foreground text-sm">Create a new employee with a login account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="id">Employee ID *</Label>
                <Input
                  id="id"
                  value={form.id}
                  onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
                  placeholder="e.g. EMP001"
                />
                {errors.id && <p className="text-xs text-destructive">{errors.id}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="John Doe"
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="john@example.com"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(555) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  placeholder="e.g. Operations"
                />
                {errors.department && <p className="text-xs text-destructive">{errors.department}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="jobTitle">Job Title *</Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={e => setForm(p => ({ ...p, jobTitle: e.target.value }))}
                  placeholder="e.g. Warehouse Associate"
                />
                {errors.jobTitle && <p className="text-xs text-destructive">{errors.jobTitle}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={v => setForm(p => ({ ...p, role: v as Role, directManagerId: '' }))}
                >
                  <SelectTrigger id="role">
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
                <Label htmlFor="badgeId">Badge ID</Label>
                <Input
                  id="badgeId"
                  value={form.badgeId}
                  onChange={e => setForm(p => ({ ...p, badgeId: e.target.value }))}
                  placeholder="Staff ID badge number"
                />
                <p className="text-xs text-muted-foreground">Used for badge scanner login</p>
              </div>
            </div>

            {/* Direct Manager */}
            <div className="space-y-1">
              <Label htmlFor="directManager">
                Direct Manager {!isManagerRole && '*'}
              </Label>
              {isManagerRole ? (
                <Input value="Human Resources" disabled className="bg-muted" />
              ) : (
                <Select
                  value={form.directManagerId}
                  onValueChange={v => setForm(p => ({ ...p, directManagerId: v }))}
                  disabled={managersLoading}
                >
                  <SelectTrigger id="directManager">
                    <SelectValue placeholder={managersLoading ? 'Loading managers...' : 'Select direct manager'} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeManagers.length > 0 ? (
                      activeManagers.map(mgr => (
                        <SelectItem key={mgr.id} value={mgr.id}>
                          {mgr.fullName}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {managersLoading ? 'Loading...' : 'No managers available'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
              {errors.directManagerId && (
                <p className="text-xs text-destructive">{errors.directManagerId}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Login Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  placeholder="johndoe"
                />
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/hr/employees' })}
            disabled={createEmployee.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createEmployee.isPending}>
            {createEmployee.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create Employee'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
