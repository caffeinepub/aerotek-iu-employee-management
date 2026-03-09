import { AlertCircle, Eye, EyeOff, Info, Plus, UserCog } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Role } from "../../backend";
import { extractErrorMessage, useCreateAccount } from "../../hooks/useQueries";

// Managers can only assign Employee or Manager roles
const ROLE_OPTIONS = [
  { value: Role.employee, label: "Employee", color: "text-green-400" },
  { value: Role.manager, label: "Manager", color: "text-blue-400" },
];

export default function ManagerAccountManagementPage() {
  const createMutation = useCreateAccount();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: Role.employee as Role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const resetForm = () => {
    setForm({
      displayName: "",
      username: "",
      password: "",
      confirmPassword: "",
      role: Role.employee,
    });
    setErrors({});
    setServerError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.displayName.trim()) e.displayName = "Display name is required";
    if (!form.username.trim()) e.username = "Username is required";
    else if (form.username.length < 3)
      e.username = "Username must be at least 3 characters";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Password must be at least 6 characters";
    if (!form.confirmPassword) e.confirmPassword = "Please confirm password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    try {
      await createMutation.mutateAsync({
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        passwordHash: form.password,
        role: form.role,
      });
      toast.success(`Account "${form.username}" created successfully!`);
      setModalOpen(false);
      resetForm();
    } catch (err) {
      const msg = extractErrorMessage(err);
      setServerError(msg);
      if (msg.toLowerCase().includes("username")) {
        setErrors((prev) => ({ ...prev, username: msg }));
      }
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    if (serverError) setServerError("");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCog className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">
              Account Management
            </h1>
          </div>
          <p className="text-navy-400 text-sm">
            Create Employee and Manager login accounts
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-navy-950 font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-300 text-sm font-medium">
            Manager Account Permissions
          </p>
          <p className="text-blue-400/70 text-xs mt-0.5">
            As a Manager, you can create <strong>Employee</strong> and{" "}
            <strong>Manager</strong> accounts only. HR Admin and Supervisor
            roles can only be assigned by HR Admins.
          </p>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-green-500/5 border border-green-500/15 rounded-2xl p-5">
          <p className="text-green-400 font-semibold text-sm mb-2">Employee</p>
          <ul className="space-y-1.5">
            {[
              "View own schedule",
              "Submit time off requests",
              "View own PTO balance",
              "Self-service portal",
            ].map((p) => (
              <li
                key={p}
                className="text-navy-400 text-xs flex items-center gap-1.5"
              >
                <span className="w-1 h-1 rounded-full bg-green-500/60" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5">
          <p className="text-blue-400 font-semibold text-sm mb-2">Manager</p>
          <ul className="space-y-1.5">
            {[
              "Manage team members",
              "Schedule shifts",
              "Approve time off",
              "Create Employee/Manager accounts",
            ].map((p) => (
              <li
                key={p}
                className="text-navy-400 text-xs flex items-center gap-1.5"
              >
                <span className="w-1 h-1 rounded-full bg-blue-500/60" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Create Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-navy-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <UserCog className="w-5 h-5 text-amber-400" />
              <h3 className="text-white font-semibold text-lg">
                Create Account
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="acc-displayName"
                  className="block text-sm font-medium text-navy-200 mb-1.5"
                >
                  Display Name *
                </label>
                <input
                  id="acc-displayName"
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 bg-navy-800/60 border rounded-xl text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${errors.displayName ? "border-red-500/50" : "border-navy-600/50"}`}
                />
                {errors.displayName && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.displayName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="acc-username"
                  className="block text-sm font-medium text-navy-200 mb-1.5"
                >
                  Username *
                </label>
                <input
                  id="acc-username"
                  type="text"
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="johndoe123"
                  autoComplete="off"
                  className={`w-full px-4 py-3 bg-navy-800/60 border rounded-xl text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${errors.username ? "border-red-500/50" : "border-navy-600/50"}`}
                />
                {errors.username && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.username}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="acc-password"
                  className="block text-sm font-medium text-navy-200 mb-1.5"
                >
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="acc-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 pr-12 bg-navy-800/60 border rounded-xl text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${errors.password ? "border-red-500/50" : "border-navy-600/50"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="acc-confirmPassword"
                  className="block text-sm font-medium text-navy-200 mb-1.5"
                >
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="acc-confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 pr-12 bg-navy-800/60 border rounded-xl text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${errors.confirmPassword ? "border-red-500/50" : "border-navy-600/50"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-200"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="acc-role"
                  className="block text-sm font-medium text-navy-200 mb-1.5"
                >
                  Role *
                </label>
                <select
                  id="acc-role"
                  value={form.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  className="w-full px-4 py-3 bg-navy-800/60 border border-navy-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {serverError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {serverError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2.5 bg-navy-800 border border-navy-600/50 text-navy-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-navy-950 font-semibold rounded-xl text-sm transition-all"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
