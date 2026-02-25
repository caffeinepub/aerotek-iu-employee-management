import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateEmployeeWithAccount, useGetAllEmployees } from '../../hooks/useQueries';
import { Employee, Role, EmployeeStatus } from '../../backend';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, UserPlus } from 'lucide-react';

function generateId(): string {
  return `emp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function AddEmployeePage() {
  const navigate = useNavigate();
  const createEmployeeWithAccount = useCreateEmployeeWithAccount();
  const { data: allEmployees = [] } = useGetAllEmployees();

  const managers = allEmployees.filter(
    (e: Employee) => e.role === Role.manager || e.role === Role.hrAdmin
  );

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    jobTitle: '',
    badgeId: '',
    role: Role.employee as Role,
    directManagerId: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim()) {
      toast.error('Full name is required.');
      return;
    }
    if (!form.username.trim()) {
      toast.error('Username is required.');
      return;
    }
    if (!form.password.trim()) {
      toast.error('Password is required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    const employeeId = generateId();
    const profile: Employee = {
      id: employeeId,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      department: form.department.trim(),
      jobTitle: form.jobTitle.trim(),
      startDate: BigInt(Date.now()),
      role: form.role,
      status: EmployeeStatus.active,
      badgeId: form.badgeId.trim(),
      directManagerId: form.directManagerId || undefined,
    };

    try {
      await createEmployeeWithAccount.mutateAsync({
        profile,
        username: form.username.trim(),
        passwordHash: form.password,
        displayName: form.fullName.trim(),
        directManagerId: form.directManagerId || undefined,
      });
      toast.success('Employee and account created successfully!');
      navigate({ to: '/hr/employees' });
    } catch (e) {
      toast.error(`Failed to create employee: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/hr/employees' })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Employee</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create an employee profile and login account
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="jane@company.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 555-0100"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder="Engineering"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => handleChange('jobTitle', e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="badgeId">Badge ID</Label>
                <Input
                  id="badgeId"
                  value={form.badgeId}
                  onChange={(e) => handleChange('badgeId', e.target.value)}
                  placeholder="BADGE-001"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => handleChange('role', v)}
                >
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
                <Label htmlFor="directManager">Direct Manager</Label>
                {managers.length === 0 ? (
                  <div className="text-sm text-muted-foreground border rounded-md px-3 py-2">
                    No managers available
                  </div>
                ) : (
                  <Select
                    value={form.directManagerId || '__none__'}
                    onValueChange={(v) => handleChange('directManagerId', v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager (optional)" />
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
                )}
              </div>
            </CardContent>
          </Card>

          {/* Login Account */}
          <Card>
            <CardHeader>
              <CardTitle>Login Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="janedoe"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: '/hr/employees' })}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createEmployeeWithAccount.isPending}>
            {createEmployeeWithAccount.isPending ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Create Employee
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
