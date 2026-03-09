import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Edit3,
  Mail,
  Phone,
  Shield,
  Upload,
  User,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EmployeeStatus, Role } from "../../backend";
import { useAuthContext } from "../../contexts/AuthContext";
import {
  useGetAllEmployees,
  useUpdateEmployeeProfile,
} from "../../hooks/useQueries";

function formatDate(ts: bigint | number | undefined): string {
  if (ts === undefined || ts === null) return "—";
  try {
    const ms = typeof ts === "bigint" ? Number(ts) / 1_000_000 : Number(ts);
    if (Number.isNaN(ms) || ms <= 0) return "—";
    return new Date(ms).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
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
      return String(role);
  }
}

function getStatusVariant(
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

function getStatusLabel(status: EmployeeStatus): string {
  switch (status) {
    case EmployeeStatus.active:
      return "Active";
    case EmployeeStatus.inactive:
      return "Inactive";
    case EmployeeStatus.terminated:
      return "Terminated";
    default:
      return String(status);
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  // Allow various phone formats: digits, spaces, dashes, parentheses, plus
  return /^[\d\s\-\+\(\)]{7,20}$/.test(phone.trim());
}

export default function EmployeeProfilePage() {
  const { session } = useAuthContext();
  const { data: employees, isLoading } = useGetAllEmployees();
  const updateProfile = useUpdateEmployeeProfile();

  const employeeId = session?.employeeId;
  const employee = employees?.find((e) => e.id === employeeId);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when employee data loads
  useEffect(() => {
    if (employee) {
      setEmail(employee.email || "");
      setPhone(employee.phone || "");
      setImagePreview(employee.profileImageUrl || null);
    }
  }, [employee]);

  const handleEditStart = () => {
    if (employee) {
      setEmail(employee.email || "");
      setPhone(employee.phone || "");
      setImagePreview(employee.profileImageUrl || null);
      setImageFile(null);
      setEmailError("");
      setPhoneError("");
    }
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEmailError("");
    setPhoneError("");
    setImageFile(null);
    if (employee) {
      setEmail(employee.email || "");
      setPhone(employee.phone || "");
      setImagePreview(employee.profileImageUrl || null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB.");
      return;
    }

    setImageFile(file);

    // Create preview using FileReader
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    // Validate
    let hasError = false;

    if (!email.trim()) {
      setEmailError("Email is required.");
      hasError = true;
    } else if (!isValidEmail(email.trim())) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    } else {
      setEmailError("");
    }

    if (!phone.trim()) {
      setPhoneError("Phone number is required.");
      hasError = true;
    } else if (!isValidPhone(phone.trim())) {
      setPhoneError("Please enter a valid phone number.");
      hasError = true;
    } else {
      setPhoneError("");
    }

    if (hasError || !employeeId) return;

    // Determine profile image URL
    let profileImageUrl: string | null = employee?.profileImageUrl ?? null;

    if (imageFile) {
      // Convert file to base64 data URL for storage
      profileImageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    } else if (imagePreview === null) {
      profileImageUrl = null;
    }

    try {
      await updateProfile.mutateAsync({
        employeeId,
        email: email.trim(),
        phone: phone.trim(),
        profileImageUrl,
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      setImageFile(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    }
  };

  if (!employeeId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                No employee record is linked to your account. Please contact HR
                to link your account to an employee profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                Employee profile not found. Please contact HR.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentImageUrl = isEditing
    ? imagePreview
    : employee.profileImageUrl || null;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">
          My Profile
        </h1>
        <p className="text-sm text-[oklch(0.52_0.02_250)] mt-1">
          View and manage your profile information
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border-[oklch(0.88_0.01_240)]">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[oklch(0.62_0.18_160)] flex items-center justify-center flex-shrink-0 border-2 border-[oklch(0.88_0.01_240)]">
                  {currentImageUrl ? (
                    <img
                      src={currentImageUrl}
                      alt={employee.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-2xl font-bold">
                      {employee.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[oklch(0.18_0.04_255)] text-white flex items-center justify-center hover:bg-[oklch(0.28_0.04_255)] transition-colors shadow-md"
                    title="Change photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div>
                <CardTitle className="text-xl text-[oklch(0.18_0.04_255)]">
                  {employee.fullName}
                </CardTitle>
                <CardDescription className="text-sm mt-0.5">
                  {employee.jobTitle}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusVariant(employee.status)}>
                    {getStatusLabel(employee.status)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getRoleLabel(employee.role)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Edit / Cancel button */}
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditStart}
                className="gap-2 flex-shrink-0"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditCancel}
                className="gap-2 flex-shrink-0 text-muted-foreground"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />

          {/* Image upload area (only in edit mode) */}
          {isEditing && (
            // biome-ignore lint/a11y/useKeyWithClickEvents: file picker trigger, keyboard handled by hidden input
            <div
              className="border-2 border-dashed border-[oklch(0.78_0.16_75)] rounded-lg p-4 text-center cursor-pointer hover:bg-[oklch(0.97_0.005_240)] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-[oklch(0.52_0.02_250)]" />
              <p className="text-sm text-[oklch(0.52_0.02_250)]">
                {imageFile ? (
                  <span className="text-[oklch(0.62_0.18_160)] font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {imageFile.name}
                  </span>
                ) : (
                  <>
                    Click to upload a new profile photo{" "}
                    <span className="text-xs">(max 2MB)</span>
                  </>
                )}
              </p>
            </div>
          )}

          <Separator />

          {/* Editable Fields */}
          <div>
            <h3 className="text-sm font-semibold text-[oklch(0.35_0.02_250)] uppercase tracking-wide mb-4">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-email"
                  className="flex items-center gap-1.5 text-sm font-medium"
                >
                  <Mail className="w-3.5 h-3.5 text-[oklch(0.52_0.02_250)]" />
                  Email Address
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                      }}
                      placeholder="your@email.com"
                      className={emailError ? "border-destructive" : ""}
                    />
                    {emailError && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {emailError}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[oklch(0.18_0.04_255)] py-2 px-3 bg-[oklch(0.97_0.005_240)] rounded-md">
                    {employee.email || "—"}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-phone"
                  className="flex items-center gap-1.5 text-sm font-medium"
                >
                  <Phone className="w-3.5 h-3.5 text-[oklch(0.52_0.02_250)]" />
                  Phone Number
                </Label>
                {isEditing ? (
                  <div>
                    <Input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError("");
                      }}
                      placeholder="+1 (555) 000-0000"
                      className={phoneError ? "border-destructive" : ""}
                    />
                    {phoneError && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {phoneError}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[oklch(0.18_0.04_255)] py-2 px-3 bg-[oklch(0.97_0.005_240)] rounded-md">
                    {employee.phone || "—"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Read-only Fields */}
          <div>
            <h3 className="text-sm font-semibold text-[oklch(0.35_0.02_250)] uppercase tracking-wide mb-4">
              Employment Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  <Building2 className="w-3.5 h-3.5" />
                  Department
                </p>
                <p className="text-sm text-[oklch(0.18_0.04_255)] py-2 px-3 bg-[oklch(0.97_0.005_240)] rounded-md">
                  {employee.department || "—"}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  <Briefcase className="w-3.5 h-3.5" />
                  Job Title
                </p>
                <p className="text-sm text-[oklch(0.18_0.04_255)] py-2 px-3 bg-[oklch(0.97_0.005_240)] rounded-md">
                  {employee.jobTitle || "—"}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5" />
                  Start Date
                </p>
                <p className="text-sm text-[oklch(0.18_0.04_255)] py-2 px-3 bg-[oklch(0.97_0.005_240)] rounded-md">
                  {formatDate(employee.startDate)}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  <Shield className="w-3.5 h-3.5" />
                  Role
                </p>
                <p className="text-sm text-[oklch(0.18_0.04_255)] py-2 px-3 bg-[oklch(0.97_0.005_240)] rounded-md">
                  {getRoleLabel(employee.role)}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  <User className="w-3.5 h-3.5" />
                  Employee ID
                </p>
                <p className="text-sm text-[oklch(0.18_0.04_255)] py-2 px-3 bg-[oklch(0.97_0.005_240)] rounded-md font-mono">
                  {employee.id}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  <Shield className="w-3.5 h-3.5" />
                  Status
                </p>
                <div className="py-2 px-3 bg-[oklch(0.97_0.005_240)] rounded-md">
                  <Badge variant={getStatusVariant(employee.status)}>
                    {getStatusLabel(employee.status)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <>
              <Separator />
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleEditCancel}
                  disabled={updateProfile.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                  className="gap-2 bg-[oklch(0.18_0.04_255)] hover:bg-[oklch(0.28_0.04_255)] text-white"
                >
                  {updateProfile.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info note */}
      <p className="text-xs text-[oklch(0.52_0.02_250)] text-center">
        To update your name, department, job title, or other details, please
        contact HR.
      </p>
    </div>
  );
}
