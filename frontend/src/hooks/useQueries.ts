import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type {
  Employee,
  Shift,
  TimeOffRequest,
  JobPosting,
  Applicant,
  ApplicantStage,
  PTOPolicy,
  PTOBalance,
  UserProfile,
  Timesheet,
  Role,
  CreateEmployeeWithAccountInput,
} from '../backend';

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    const rejectMatch = msg.match(/Reject text: (.+)/);
    if (rejectMatch) return rejectMatch[1];
    return msg;
  }
  return String(error);
}

// ===== Employee Hooks =====

export function useGetAllEmployees() {
  const { actor, isFetching } = useActor();
  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployees();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEmployee(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getEmployee(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useGetEmployeesByRole(role: Role) {
  const { actor, isFetching } = useActor();
  return useQuery<Employee[]>({
    queryKey: ['employeesByRole', role],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getEmployeesByRole(role);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEmployeeWithAccountInput) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createEmployeeWithAccount(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeesByRole'] });
    },
  });
}

export function useCreateEmployeeWithAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEmployeeWithAccountInput) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createEmployeeWithAccount(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useUpdateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, profile }: { id: string; profile: Employee }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateEmployee(id, profile);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] });
    },
  });
}

export function useDeactivateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deactivateEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeleteEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.deleteEmployee(id);
      if (result.__kind__ === 'err') {
        throw new Error(result.err);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// ===== Badge Login =====

export function useLoginWithBadgeId() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (badgeId: string): Promise<UserProfile> => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.loginWithBadgeId(badgeId);
      if (result.__kind__ === 'err') {
        throw new Error(result.err);
      }
      return result.ok as UserProfile;
    },
  });
}

// ===== Job Posting Queries =====

export function useGetAllJobPostings() {
  const { actor, isFetching } = useActor();
  return useQuery<JobPosting[]>({
    queryKey: ['jobPostings'],
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
      if (!actor) throw new Error('Actor not available');
      return actor.createJobPosting(posting);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobPostings'] });
    },
  });
}

export function useUpdateJobPosting() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, posting }: { id: string; posting: JobPosting }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateJobPosting(id, posting);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobPostings'] });
    },
  });
}

// ===== Applicant Queries =====

export function useGetAllApplicants() {
  const { actor, isFetching } = useActor();
  return useQuery<Applicant[]>({
    queryKey: ['applicants'],
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
    queryKey: ['applicants', jobPostingId],
    queryFn: async () => {
      if (!actor) return [];
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
      if (!actor) throw new Error('Actor not available');
      return actor.addApplicant(applicant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
    },
  });
}

export function useUpdateApplicantStage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: ApplicantStage }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateApplicantStage(id, stage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
    },
  });
}

// ===== Shift Queries =====

export function useGetShiftsForDepartment(department: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Shift[]>({
    queryKey: ['shifts', 'department', department],
    queryFn: async () => {
      if (!actor || !department) return [];
      return actor.getAllShiftsForDepartment(department);
    },
    enabled: !!actor && !isFetching && !!department,
  });
}

export function useGetShiftsForEmployee(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Shift[]>({
    queryKey: ['shifts', 'employee', employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      return actor.getAllShiftsForEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && !!employeeId,
    staleTime: 0,
  });
}

export function useAssignShift() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shift: Shift) => {
      if (!actor) throw new Error('Actor not available');
      return actor.assignShift(shift);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useDeleteShift() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteShift(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function usePublishSchedule() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ department, weekStart }: { department: string; weekStart: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.publishSchedule(department, weekStart);
      if (result.__kind__ === 'err') {
        throw new Error(result.err);
      }
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useUnpublishSchedule() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ department, weekStart }: { department: string; weekStart: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.unpublishSchedule(department, weekStart);
      if (result.__kind__ === 'err') {
        throw new Error(result.err);
      }
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

// ===== Time Off Queries =====

export function useGetAllTimeOffRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<TimeOffRequest[]>({
    queryKey: ['timeOffRequests'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTimeOffRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTimeOffRequestsForEmployee(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<TimeOffRequest[]>({
    queryKey: ['timeOffRequests', employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      return actor.getAllTimeOffRequestsForEmployee(employeeId);
    },
    enabled: !!actor && !isFetching && !!employeeId,
  });
}

export function useSubmitTimeOffRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: TimeOffRequest) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitTimeOffRequest(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
    },
  });
}

export function useApproveTimeOffRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approveTimeOffRequest(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
    },
  });
}

export function useDenyTimeOffRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.denyTimeOffRequest(id, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeOffRequests'] });
    },
  });
}

// ===== PTO Queries =====

export function useGetAllPTOPolicies() {
  const { actor, isFetching } = useActor();
  return useQuery<PTOPolicy[]>({
    queryKey: ['ptoPolicies'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPTOPolicies();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPTOBalance(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<PTOBalance>({
    queryKey: ['ptoBalance', employeeId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPTOBalance(employeeId);
    },
    enabled: !!actor && !isFetching && !!employeeId,
    retry: false,
  });
}

export function useAddPTOPolicy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policy: PTOPolicy) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addPTOPolicy(policy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptoPolicies'] });
    },
  });
}

export function useUpdatePTOPolicy() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (policy: PTOPolicy) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePTOPolicy(policy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptoPolicies'] });
    },
  });
}

export function useUpdatePTOBalance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (balance: PTOBalance) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updatePTOBalance(balance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptoBalance'] });
    },
  });
}

export function useAddPTOBalance() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (balance: PTOBalance) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addPTOBalance(balance);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ptoBalance'] });
    },
  });
}

// ===== Account Queries =====

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
      if (!actor) throw new Error('Actor not available');
      return actor.createAccount(displayName, username, passwordHash, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useSetRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ username, role }: { username: string; role: Role }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setRole(username, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

// ===== Timesheet Hooks =====

export function useTimesheets() {
  const { actor, isFetching } = useActor();
  return useQuery<Timesheet[]>({
    queryKey: ['timesheets'],
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
      if (!actor) throw new Error('Actor not available');
      const result = await actor.submitTimesheet(timesheet);
      if (result.__kind__ === 'err') throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
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
      if (!actor) throw new Error('Actor not available');
      const result = await actor.managerReviewTimesheet(id, approved, comment);
      if (result.__kind__ === 'err') throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

export function useHrReviewTimesheet() {
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
      if (!actor) throw new Error('Actor not available');
      const result = await actor.hrReviewTimesheet(id, approved, comment);
      if (result.__kind__ === 'err') throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}
