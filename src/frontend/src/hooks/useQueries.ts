import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AccountInfo,
  Applicant,
  ApplicantStage,
  CreateEmployeeWithAccountInput,
  Employee,
  JobPosting,
  LinkEmployeeToAccountInput,
  Notification,
  PTOBalance,
  PTOPolicy,
  Role,
  Shift,
  TimeOffRequest,
  Timesheet,
  UserProfile,
} from "../backend";
import { useActor } from "./useActor";

// ── helper ────────────────────────────────────────────────────────────────────

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

// ── Employees ─────────────────────────────────────────────────────────────────

export function useGetAllEmployees() {
  const { actor, isFetching } = useActor();
  return useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployees();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEmployee(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Employee | null>({
    queryKey: ["employee", id],
    queryFn: async () => {
      if (!actor || !id) return null;
      try {
        return await actor.getEmployee(id);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useCreateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Employee) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createEmployee(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useCreateEmployeeWithAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEmployeeWithAccountInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createEmployeeWithAccount(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useUpdateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, profile }: { id: string; profile: Employee }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateEmployee(id, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeactivateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deactivateEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useDeleteEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.deleteEmployee(id);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployeeProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      employeeId,
      email,
      phone,
      profileImageUrl,
    }: {
      employeeId: string;
      email: string;
      phone: string;
      profileImageUrl: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.updateEmployeeProfile(
        employeeId,
        email,
        phone,
        profileImageUrl,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

// ── Account Linking ───────────────────────────────────────────────────────────

export function useGetUnlinkedAccounts() {
  const { actor, isFetching } = useActor();
  return useQuery<AccountInfo[]>({
    queryKey: ["unlinkedAccounts"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getUnlinkedAccounts();
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

export function useLinkEmployeeToAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LinkEmployeeToAccountInput) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.linkEmployeeToAccount(input);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["unlinkedAccounts"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export function useCreateAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      displayName,
      username,
      passwordHash,
      role,
    }: {
      displayName: string;
      username: string;
      passwordHash: string;
      role: Role;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createAccount(displayName, username, passwordHash, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

// ── Shifts ────────────────────────────────────────────────────────────────────

export function useGetShiftsForEmployee(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Shift[]>({
    queryKey: ["shifts", "employee", employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      return actor.getAllShiftsForEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && !!employeeId,
    staleTime: 0,
    refetchInterval: 30000,
  });
}

export function useGetMyShifts() {
  const { actor, isFetching } = useActor();
  return useQuery<Shift[]>({
    queryKey: ["shifts", "mine"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getShifts();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchInterval: 30000,
  });
}

export function useGetShiftsForDepartment(department: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Shift[]>({
    queryKey: ["shifts", "department", department],
    queryFn: async () => {
      if (!actor || !department) return [];
      return actor.getAllShiftsForDepartment(department);
    },
    enabled: !!actor && !isFetching && !!department,
    staleTime: 0,
    refetchInterval: 30000,
  });
}

export function useAssignShift() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shift: Shift) => {
      if (!actor) throw new Error("Actor not available");
      return actor.assignShift(shift);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useDeleteShift() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteShift(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function usePublishSchedule() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      department,
      weekStart,
    }: { department: string; weekStart: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.publishSchedule(department, weekStart);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

export function useUnpublishSchedule() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      department,
      weekStart,
    }: { department: string; weekStart: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.unpublishSchedule(department, weekStart);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
  });
}

// ── Time Off ──────────────────────────────────────────────────────────────────

/**
 * Fetches all time-off requests visible to the current caller's role.
 * HR Admins and Managers see all requests; Employees see only their own.
 * Uses actor.getTimeOffRequests() — the role-aware backend endpoint.
 */
export function useGetAllTimeOffRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<TimeOffRequest[]>({
    queryKey: ["timeOffRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTimeOffRequests();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

export function useGetTimeOffRequestsForEmployee(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<TimeOffRequest[]>({
    queryKey: ["timeOffRequests", "employee", employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      return actor.getAllTimeOffRequestsForEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && !!employeeId,
    staleTime: 0,
  });
}

export function useSubmitTimeOffRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: TimeOffRequest) => {
      if (!actor) throw new Error("Actor not available");
      return actor.submitTimeOffRequest(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] });
    },
  });
}

export function useApproveTimeOffRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveTimeOffRequest(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] });
    },
  });
}

export function useDenyTimeOffRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.denyTimeOffRequest(id, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] });
    },
  });
}

// ── Timesheets ────────────────────────────────────────────────────────────────

/**
 * Fetches all timesheets visible to the current caller's role.
 * HR Admins and Managers see all timesheets; Employees see only their own.
 * staleTime: 0 ensures data is always refetched on component mount.
 */
export function useGetTimesheets() {
  const { actor, isFetching } = useActor();
  return useQuery<Timesheet[]>({
    queryKey: ["timesheets"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTimesheets();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

export function useSubmitTimesheet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (timesheet: Timesheet) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.submitTimesheet(timesheet);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

export function useManagerReviewTimesheet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      approved,
      comment,
    }: {
      id: string;
      approved: boolean;
      comment: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.managerReviewTimesheet(id, approved, comment);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

export function useManagerEditTimesheet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (timesheet: Timesheet) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.submitTimesheet(timesheet);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

export function useHRReviewTimesheet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      approved,
      comment,
    }: {
      id: string;
      approved: boolean;
      comment: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.hrReviewTimesheet(id, approved, comment);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    },
  });
}

// ── Badge Login ───────────────────────────────────────────────────────────────

export function useLoginWithBadgeId() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (badgeId: string): Promise<UserProfile> => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.loginWithBadgeId(badgeId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
  });
}

// ── Job Postings ──────────────────────────────────────────────────────────────

export function useGetAllJobPostings() {
  const { actor, isFetching } = useActor();
  return useQuery<JobPosting[]>({
    queryKey: ["jobPostings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllJobPostings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateJobPosting() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (posting: JobPosting) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createJobPosting(posting);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPostings"] });
    },
  });
}

export function useUpdateJobPosting() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      posting,
    }: { id: string; posting: JobPosting }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateJobPosting(id, posting);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobPostings"] });
    },
  });
}

// ── Applicants ────────────────────────────────────────────────────────────────

export function useGetAllApplicants() {
  const { actor, isFetching } = useActor();
  return useQuery<Applicant[]>({
    queryKey: ["applicants"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllApplicants();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetApplicantsForPosting(jobPostingId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Applicant[]>({
    queryKey: ["applicants", "posting", jobPostingId],
    queryFn: async () => {
      if (!actor || !jobPostingId) return [];
      return actor.getApplicantsForPosting(jobPostingId);
    },
    enabled: !!actor && !isFetching && !!jobPostingId,
  });
}

export function useAddApplicant() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (applicant: Applicant) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addApplicant(applicant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });
}

export function useUpdateApplicantStage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      stage,
    }: { id: string; stage: ApplicantStage }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateApplicantStage(id, stage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applicants"] });
    },
  });
}

// ── PTO ───────────────────────────────────────────────────────────────────────

export function useGetAllPTOPolicies() {
  const { actor, isFetching } = useActor();
  return useQuery<PTOPolicy[]>({
    queryKey: ["ptoPolicies"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPTOPolicies();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePTOPolicy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policy: PTOPolicy) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addPTOPolicy(policy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptoPolicies"] });
    },
  });
}

// Alias for backward compatibility with PTOPolicyFormPage
export const useAddPTOPolicy = useCreatePTOPolicy;

export function useUpdatePTOPolicy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policy: PTOPolicy) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updatePTOPolicy(policy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptoPolicies"] });
    },
  });
}

export function useGetPTOBalance(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<PTOBalance | null>({
    queryKey: ["ptoBalance", employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return null;
      try {
        return await actor.getPTOBalance(employeeId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!employeeId,
  });
}

export function useUpdatePTOBalance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (balance: PTOBalance) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updatePTOBalance(balance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptoBalance"] });
    },
  });
}

export function useAddPTOBalance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (balance: PTOBalance) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addPTOBalance(balance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptoBalance"] });
    },
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

/**
 * Fetches all notifications for the current user.
 * Polls every 30 seconds to detect new notifications.
 */
export function useNotifications() {
  const { actor, isFetching } = useActor();
  return useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getNotifications();
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchInterval: 30000,
  });
}

/**
 * Marks a single notification as read by ID.
 */
export function useMarkNotificationRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.markNotificationRead(notificationId);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * Marks all of the current user's notifications as read.
 */
export function useMarkAllNotificationsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.markAllNotificationsRead();
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/**
 * HR Admin only: sends an urgent alert message to all active staff.
 */
export function useSendUrgentAlert() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (message: string) => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.sendUrgentAlert(message);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
