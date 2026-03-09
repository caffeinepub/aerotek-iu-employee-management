import { Alert, AlertDescription } from "@/components/ui/alert";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit,
  Link,
  Save,
  Search,
  Trash2,
  UserX,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import {
  type AccountInfo,
  type Employee,
  EmployeeStatus,
  Role,
} from "../../backend";
import { useAuthContext } from "../../contexts/AuthContext";
import {
  useDeactivateEmployee,
  useDeleteEmployee,
  useGetAllEmployees,
  useGetEmployee,
  useGetUnlinkedAccounts,
  useLinkEmployeeToAccount,
  useUpdateEmployee,
} from "../../hooks/useQueries";

function getStatusBadgeVariant(
  status: EmployeeStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case EmployeeStatus.active:
      return "default";
    case EmployeeStatus.inactive:
      return "secondary";
    case EmployeeStatus.terminated:
      return "destructive";
    default:
      return "outline";
  }
}

function getRoleLabel(role: Role): string {
  switch (role) {
    case Role.hrAdmin:
      return "HR Admin";
    case Role.manager:
      return "Manager";
    case Role.employee:
      return "Employee";
    case Role.supervisor:
      return "Supervisor";
    default:
      return role;
  }
}

// ── Account Linking Section ───────────────────────────────────────────────────

interface AccountLinkingSectionProps {
  employeeId: string;
  linkedAccountUsername?: string;
}

function AccountLinkingSection({
  employeeId,
  linkedAccountUsername,
}: AccountLinkingSectionProps) {
  const [wantToLink, setWantToLink] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [linkError, setLinkError] = useState("");

  const { data: unlinkedAccounts = [], isLoading: accountsLoading } =
    useGetUnlinkedAccounts();
  const linkMutation = useLinkEmployeeToAccount();

  const filteredAccounts = unlinkedAccounts.filter((acc: AccountInfo) => {
    const q = searchQuery.toLowerCase();
    return (
      acc.username.toLowerCase().includes(q) ||
      acc.displayName.toLowerCase().includes(q)
    );
  });

  const handleSaveLink = async () => {
    if (!selectedAccount) {
      setLinkError("Please select an account to link.");
      return;
    }
    setLinkError("");
    try {
      await linkMutation.mutateAsync({
        employeeId,
        accountUsername: selectedAccount,
      });
      toast.success("Account linked successfully");
      setWantToLink(false);
      setSelectedAccount("");
      setSearchQuery("");
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : "Failed to link account");
    }
  };

  const handleCancel = () => {
    setWantToLink(false);
    setSelectedAccount("");
    setSearchQuery("");
    setLinkError("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link className="h-4 w-4" />
          Account Linking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current linked status */}
        {linkedAccountUsername ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Linked Account
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                {linkedAccountUsername}
              </p>
            </div>
            <Badge
              variant="default"
              className="ml-auto bg-green-600 hover:bg-green-700"
            >
              Linked
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed border-border">
            <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                No Account Linked
              </p>
              <p className="text-xs text-muted-foreground">
                Link a login account so this employee can access self-service
                features.
              </p>
            </div>
          </div>
        )}

        {/* Link toggle */}
        {!linkedAccountUsername &&
          (!wantToLink ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWantToLink(true)}
              className="gap-2"
            >
              <Link className="h-4 w-4" />
              Link to Account
            </Button>
          ) : (
            <div className="space-y-3">
              <Separator />
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Select Login Account
                </Label>
                <p className="text-xs text-muted-foreground">
                  Choose an unlinked account to associate with this employee.
                </p>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  disabled={accountsLoading || linkMutation.isPending}
                />
              </div>

              {/* Account dropdown */}
              {accountsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : filteredAccounts.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg text-center">
                  {unlinkedAccounts.length === 0
                    ? "No unlinked accounts available."
                    : "No accounts match your search."}
                </div>
              ) : (
                <Select
                  value={selectedAccount}
                  onValueChange={(v) => {
                    setSelectedAccount(v);
                    setLinkError("");
                  }}
                  disabled={linkMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map((acc: AccountInfo) => (
                      <SelectItem key={acc.username} value={acc.username}>
                        <span className="font-mono">{acc.username}</span>
                        <span className="text-muted-foreground ml-2">
                          — {acc.displayName} ({getRoleLabel(acc.role)})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Error message */}
              {linkError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{linkError}</AlertDescription>
                </Alert>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveLink}
                  disabled={
                    !selectedAccount ||
                    linkMutation.isPending ||
                    accountsLoading
                  }
                  className="gap-2"
                >
                  {linkMutation.isPending ? (
                    <>
                      <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Link className="h-3.5 w-3.5" />
                      Save Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={linkMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeeDetailPage() {
  const params = useParams({ from: "/hr/employees/$id" });
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
    (e: Employee) => e.role === Role.manager || e.role === Role.hrAdmin,
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
      toast.success("Employee updated successfully!");
      setIsEditing(false);
    } catch (e) {
      toast.error(
        `Failed to update: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateEmployee.mutateAsync(id);
      toast.success("Employee deactivated.");
    } catch (e) {
      toast.error(
        `Failed to deactivate: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success("Employee deleted.");
      navigate({ to: "/hr/employees" });
    } catch (e) {
      toast.error(
        `Failed to delete: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
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
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/hr/employees" })}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>
      </div>
    );
  }

  const managerName = employee.directManagerId
    ? (allEmployees.find((e: Employee) => e.id === employee.directManagerId)
        ?.fullName ?? employee.directManagerId)
    : "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/hr/employees" })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {employee.fullName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {employee.jobTitle} · {employee.department}
          </p>
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
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateEmployee.isPending}
              >
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
                  value={form.fullName ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  value={form.email ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input
                  value={form.department ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, department: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Job Title</Label>
                <Input
                  value={form.jobTitle ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jobTitle: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Badge ID</Label>
                <Input
                  value={form.badgeId ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, badgeId: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Direct Manager</Label>
                <Select
                  value={form.directManagerId ?? "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      directManagerId: v === "__none__" ? undefined : v,
                    }))
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
                <p className="text-sm font-medium">{employee.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{employee.phone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-medium">
                  {employee.department || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job Title</p>
                <p className="text-sm font-medium">
                  {employee.jobTitle || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Badge ID</p>
                <p className="text-sm font-medium">{employee.badgeId || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Direct Manager</p>
                <p className="text-sm font-medium">{managerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="text-sm font-medium capitalize">
                  {employee.role}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Account Linking — HR Admin only */}
      {isHRAdmin && (
        <AccountLinkingSection
          employeeId={employee.id}
          linkedAccountUsername={employee.linkedAccountUsername}
        />
      )}

      {isHRAdmin && (
        <div className="flex gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="text-amber-600 border-amber-600 hover:bg-amber-50"
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate Employee?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will set {employee.fullName}'s status to inactive. They
                  will no longer be able to log in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeactivate}>
                  Deactivate
                </AlertDialogAction>
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
                  This will permanently delete {employee.fullName}'s record.
                  This action cannot be undone.
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
