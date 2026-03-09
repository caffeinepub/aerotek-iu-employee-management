import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type ServiceResult_7 = {
    __kind__: "ok";
    ok: Employee;
} | {
    __kind__: "err";
    err: string;
};
export type LinkEmployeeAccountResult = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export interface TimesheetEntry {
    startTime: string;
    endTime: string;
    date: string;
    hoursWorked: number;
    buildingNumber?: string;
}
export interface Shift {
    id: string;
    startTime: bigint;
    status: ShiftStatus;
    endTime: bigint;
    date: bigint;
    employeeId: string;
    department: string;
}
export interface JobPosting {
    id: string;
    status: JobPostingStatus;
    title: string;
    description: string;
    department: string;
}
export interface Timesheet {
    id: string;
    status: TimesheetStatus;
    employeeUsername: string;
    weekStartDate: string;
    totalHours: number;
    submittedAt: bigint;
    hrComment?: string;
    entries: Array<TimesheetEntry>;
    employeeId: string;
    managerComment?: string;
}
export type ServiceResult_5 = {
    __kind__: "ok";
    ok: Array<AccountInfo>;
} | {
    __kind__: "err";
    err: string;
};
export interface PTOPolicy {
    id: string;
    name: string;
    accrualRate: number;
    eligibleLeaveTypes: Array<string>;
    maxCarryOver: number;
}
export interface AccountInfo {
    username: string;
    displayName: string;
    role: Role;
    linkedEmployeeId?: string;
}
export interface Employee {
    id: string;
    status: EmployeeStatus;
    role: Role;
    directManagerId?: string;
    fullName: string;
    email: string;
    jobTitle: string;
    badgeId: string;
    phone: string;
    department: string;
    profileImageUrl?: string;
    linkedAccountUsername?: string;
    startDate: bigint;
}
export type ServiceResult_3 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: string;
};
export type ServiceResult = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: string;
};
export type ServiceResult_4 = {
    __kind__: "ok";
    ok: UserProfile;
} | {
    __kind__: "err";
    err: string;
};
export interface CreateEmployeeWithAccountInput {
    username: string;
    displayName: string;
    directManagerId?: string;
    passwordHash: string;
    profile: Employee;
}
export type ServiceResult_6 = {
    __kind__: "ok";
    ok: Array<Notification>;
} | {
    __kind__: "err";
    err: string;
};
export type ServiceResult_1 = {
    __kind__: "ok";
    ok: bigint;
} | {
    __kind__: "err";
    err: string;
};
export interface Applicant {
    id: string;
    contact: string;
    jobPostingId: string;
    name: string;
    resumeNotes: string;
    stage: ApplicantStage;
    appliedDate: bigint;
}
export type ServiceResult_2 = {
    __kind__: "ok";
    ok: Timesheet;
} | {
    __kind__: "err";
    err: string;
};
export interface Notification {
    id: string;
    notificationType: NotificationType;
    createdAt: bigint;
    isRead: boolean;
    relatedEntityId?: string;
    message: string;
    recipientUsername: string;
}
export interface PTOBalance {
    balance: number;
    employeeId: string;
    policyId: string;
}
export interface LinkEmployeeToAccountInput {
    accountUsername: string;
    employeeId: string;
}
export interface TimeOffRequest {
    id: string;
    status: TimeOffStatus;
    endDate: bigint;
    approverComments?: string;
    timeOffType: string;
    employeeId: string;
    requestDate: bigint;
    startDate: bigint;
}
export interface UserProfile {
    username: string;
    role: Role;
    employeeId?: string;
}
export enum ApplicantStage {
    hired = "hired",
    offer = "offer",
    screening = "screening",
    interview = "interview",
    applied = "applied",
    rejected = "rejected"
}
export enum EmployeeStatus {
    active = "active",
    terminated = "terminated",
    inactive = "inactive"
}
export enum JobPostingStatus {
    closed = "closed",
    open = "open",
    draft = "draft"
}
export enum NotificationType {
    timeOffDenied = "timeOffDenied",
    scheduleUnpublished = "scheduleUnpublished",
    schedulePublished = "schedulePublished",
    timeOffSubmitted = "timeOffSubmitted",
    timeOffApproved = "timeOffApproved",
    urgentAlert = "urgentAlert"
}
export enum Role {
    supervisor = "supervisor",
    manager = "manager",
    hrAdmin = "hrAdmin",
    employee = "employee"
}
export enum ShiftStatus {
    published = "published",
    draft = "draft"
}
export enum TimeOffStatus {
    pending = "pending",
    denied = "denied",
    approved = "approved"
}
export enum TimesheetStatus {
    managerApproved = "managerApproved",
    submitted = "submitted",
    hrDenied = "hrDenied",
    managerDenied = "managerDenied",
    hrApproved = "hrApproved"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addApplicant(applicant: Applicant): Promise<void>;
    addPTOBalance(balance: PTOBalance): Promise<void>;
    addPTOPolicy(policy: PTOPolicy): Promise<void>;
    approveTimeOffRequest(requestId: string): Promise<void>;
    approveTimeOffRequestWithComment(requestId: string, comment: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignShift(shift: Shift): Promise<void>;
    createAccount(displayName: string, username: string, passwordHash: string, role: Role): Promise<void>;
    createEmployee(profile: Employee): Promise<void>;
    createEmployeeWithAccount(input: CreateEmployeeWithAccountInput): Promise<void>;
    createJobPosting(posting: JobPosting): Promise<void>;
    deactivateEmployee(id: string): Promise<void>;
    deleteEmployee(id: string): Promise<ServiceResult>;
    deleteShift(id: string): Promise<void>;
    denyTimeOffRequest(requestId: string, comments: string): Promise<void>;
    getAllApplicants(): Promise<Array<Applicant>>;
    getAllEmployees(): Promise<Array<Employee>>;
    getAllJobPostings(): Promise<Array<JobPosting>>;
    getAllPTOPolicies(): Promise<Array<PTOPolicy>>;
    getAllShiftsForDepartment(department: string): Promise<Array<Shift>>;
    getAllShiftsForEmployee(employeeId: string): Promise<Array<Shift>>;
    getAllTimeOffRequestsForEmployee(employeeId: string): Promise<Array<TimeOffRequest>>;
    getApplicant(id: string): Promise<Applicant>;
    getApplicantsForPosting(jobPostingId: string): Promise<Array<Applicant>>;
    getAvailableShifts(dep: string): Promise<Array<Shift>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getEmployee(id: string): Promise<Employee>;
    getEmployeeByBadgeId(badgeId: string): Promise<ServiceResult_7>;
    getEmployeesByRole(role: Role): Promise<Array<Employee>>;
    getJobPosting(id: string): Promise<JobPosting>;
    getNotifications(): Promise<ServiceResult_6>;
    getPTOBalance(employeeId: string): Promise<PTOBalance>;
    getPTOPolicy(policyId: string): Promise<PTOPolicy>;
    getShifts(): Promise<Array<Shift>>;
    getTimeOffRequests(): Promise<Array<TimeOffRequest>>;
    getTimesheets(): Promise<Array<Timesheet>>;
    getUnlinkedAccounts(): Promise<ServiceResult_5>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    hasConflictingShift(newShift: Shift): Promise<boolean>;
    hrReviewTimesheet(id: string, approved: boolean, comment: string): Promise<ServiceResult_3>;
    isCallerAdmin(): Promise<boolean>;
    linkEmployeeToAccount(input: LinkEmployeeToAccountInput): Promise<LinkEmployeeAccountResult>;
    login(username: string, passwordHash: string): Promise<UserProfile | null>;
    loginWithBadgeId(badgeId: string): Promise<ServiceResult_4>;
    managerReviewTimesheet(id: string, approved: boolean, comment: string): Promise<ServiceResult_3>;
    markAllNotificationsRead(): Promise<ServiceResult>;
    markNotificationRead(notificationId: string): Promise<ServiceResult>;
    publishSchedule(department: string, weekStart: bigint): Promise<ServiceResult_1>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    sendUrgentAlert(message: string): Promise<ServiceResult>;
    setRole(username: string, role: Role): Promise<void>;
    submitTimeOffRequest(request: TimeOffRequest): Promise<void>;
    submitTimesheet(timesheet: Timesheet): Promise<ServiceResult_2>;
    unpublishSchedule(department: string, weekStart: bigint): Promise<ServiceResult_1>;
    updateApplicantStage(id: string, stage: ApplicantStage): Promise<void>;
    updateEmployee(id: string, profile: Employee): Promise<void>;
    updateEmployeeProfile(employeeId: string, email: string, phone: string, profileImageUrl: string | null): Promise<ServiceResult>;
    updateJobPosting(id: string, posting: JobPosting): Promise<void>;
    updatePTOBalance(balance: PTOBalance): Promise<void>;
    updatePTOPolicy(policy: PTOPolicy): Promise<void>;
    validateSession(username: string): Promise<boolean>;
}
