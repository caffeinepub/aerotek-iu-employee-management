import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import {
  Employee,
  Shift,
  JobPosting,
  Applicant,
  ApplicantStage,
  TimeOffRequest,
  PTOPolicy,
  PTOBalance,
  Role,
  CreateEmployeeWithAccountInput,
  Timesheet,
  TimesheetStatus,
  UserProfile,
} from '../backend';

export function extractErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

// ===== Employee Queries =====

export function useGetAllEmployees() {
  const { actor, isFetching } = useActor();
  return useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllEmployees();
      } catch (err) {
        console.error('getAllEmployees error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetEmployee(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Employee | null>({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!actor || !id) return null;
      try {
        return await actor.getEmployee(id);
      } catch (err) {
        console.error('getEmployee error:', err);
        return null;
      }
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
      try {
        return await actor.getEmployeesByRole(role);
      } catch (err) {
        console.error('getEmployeesByRole error:', err);
        return [];
      }
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
      return actor.updateEmployee(id, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useDeactivateEmployee() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deactivateEmployee(id);
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

// ===== Shift Queries =====

export function useGetShiftsForEmployee(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Shift[]>({
    queryKey: ['shifts', 'employee', employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      try {
        return await actor.getAllShiftsForEmployee(employeeId);
      } catch (err) {
        console.error('getAllShiftsForEmployee error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!employeeId,
    staleTime: 0,
  });
}

export function useGetShiftsForDepartment(department: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Shift[]>({
    queryKey: ['shifts', 'department', department],
    queryFn: async () => {
      if (!actor || !department) return [];
      try {
        return await actor.getAllShiftsForDepartment(department);
      } catch (err) {
        console.error('getAllShiftsForDepartment error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!department,
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
      return result;
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
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
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
      try {
        return await actor.getAllJobPostings();
      } catch (err) {
        console.error('getAllJobPostings error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetJobPosting(id: string) {
  const { actor, isFetching } = useActor();
  return useQuery<JobPosting | null>({
    queryKey: ['jobPosting', id],
    queryFn: async () => {
      if (!actor || !id) return null;
      try {
        return await actor.getJobPosting(id);
      } catch (err) {
        console.error('getJobPosting error:', err);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
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
      try {
        return await actor.getAllApplicants();
      } catch (err) {
        console.error('getAllApplicants error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetApplicantsForPosting(jobPostingId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Applicant[]>({
    queryKey: ['applicants', 'posting', jobPostingId],
    queryFn: async () => {
      if (!actor || !jobPostingId) return [];
      try {
        return await actor.getApplicantsForPosting(jobPostingId);
      } catch (err) {
        console.error('getApplicantsForPosting error:', err);
        return [];
      }
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

// ===== Time Off Queries =====

export function useGetAllTimeOffRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<TimeOffRequest[]>({
    queryKey: ['timeOffRequests'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllTimeOffRequests();
      } catch (err) {
        console.error('getAllTimeOffRequests error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTimeOffRequestsForEmployee(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<TimeOffRequest[]>({
    queryKey: ['timeOffRequests', 'employee', employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return [];
      try {
        return await actor.getAllTimeOffRequestsForEmployee(employeeId);
      } catch (err) {
        console.error('getAllTimeOffRequestsForEmployee error:', err);
        return [];
      }
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

// ===== PTO Policy Queries =====

export function useGetAllPTOPolicies() {
  const { actor, isFetching } = useActor();
  return useQuery<PTOPolicy[]>({
    queryKey: ['ptoPolicies'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllPTOPolicies();
      } catch (err) {
        console.error('getAllPTOPolicies error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPTOPolicy(policyId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<PTOPolicy | null>({
    queryKey: ['ptoPolicy', policyId],
    queryFn: async () => {
      if (!actor || !policyId) return null;
      try {
        return await actor.getPTOPolicy(policyId);
      } catch (err) {
        console.error('getPTOPolicy error:', err);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!policyId,
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

// ===== PTO Balance Queries =====

export function useGetPTOBalance(employeeId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<PTOBalance | null>({
    queryKey: ['ptoBalance', employeeId],
    queryFn: async () => {
      if (!actor || !employeeId) return null;
      try {
        return await actor.getPTOBalance(employeeId);
      } catch (err) {
        console.error('getPTOBalance error:', err);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!employeeId,
  });
}

export function useGetAllPTOBalances() {
  const { actor, isFetching } = useActor();
  const { data: employees } = useGetAllEmployees();
  return useQuery<PTOBalance[]>({
    queryKey: ['ptoBalances'],
    queryFn: async () => {
      if (!actor || !employees) return [];
      try {
        const results = await Promise.allSettled(
          employees.map((emp) => actor.getPTOBalance(emp.id))
        );
        return results
          .filter((r): r is PromiseFulfilledResult<PTOBalance> => r.status === 'fulfilled' && r.value !== null)
          .map((r) => r.value);
      } catch (err) {
        console.error('getAllPTOBalances error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!employees,
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
      queryClient.invalidateQueries({ queryKey: ['ptoBalances'] });
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
      queryClient.invalidateQueries({ queryKey: ['ptoBalances'] });
    },
  });
}

// ===== Account Management =====

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
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useLoginWithBadgeId() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (badgeId: string) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.loginWithBadgeId(badgeId);
      if (result.__kind__ === 'err') {
        throw new Error(result.err);
      }
      return result.ok;
    },
  });
}

// ===== Timesheet Queries =====

export function useTimesheets() {
  const { actor, isFetching } = useActor();
  return useQuery<Timesheet[]>({
    queryKey: ['timesheets'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getTimesheets();
      } catch (err) {
        console.error('getTimesheets error:', err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitTimesheet() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (timesheet: Timesheet) => {
      if (!actor) throw new Error('Actor not available');
      const result = await actor.submitTimesheet(timesheet);
      if (result.__kind__ === 'err') {
        throw new Error(result.err);
      }
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
      if (result.__kind__ === 'err') {
        throw new Error(result.err);
      }
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
      if (result.__kind__ === 'err') {
        throw new Error(result.err);
      }
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
  });
}

// ===== User Profile =====

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.getCallerUserProfile();
      } catch (err) {
        console.error('getCallerUserProfile error:', err);
        return null;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}
