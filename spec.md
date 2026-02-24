# Specification

## Summary
**Goal:** Add a two-stage timesheet approval workflow (Employee → Manager → HR Admin) and ensure employees can instantly view published schedules.

**Planned changes:**
- Add a `Timesheet` record type and stable map to the backend with fields for entries, total hours, status, comments, and week start date
- Add backend endpoints: `submitTimesheet` (employee only), `getTimesheets` (role-filtered), `managerReviewTimesheet` (Manager/HR Admin), and `hrReviewTimesheet` (HR Admin only), enforcing the two-stage approval flow
- Add React Query hooks: `useTimesheets`, `useSubmitTimesheet`, `useManagerReviewTimesheet`, `useHrReviewTimesheet`
- Create `EmployeeTimesheetPage` with a weekly entry grid (start/end time inputs, auto-calculated hours, total), submission with validation, and a history list with status badges
- Create `ManagerTimesheetPage` with "Pending Your Review" and "Reviewed/Processed" sections, approve/deny actions, and optional denial comment modal
- Create `HRTimesheetPage` with "Pending Final HR Approval" (manager-approved timesheets) and "All Timesheets" sections with search and status filtering, plus final approve/deny actions
- Add "Timesheets" sidebar links and routes for HR Admin (`/hr/timesheets`), Manager (`/manager/timesheets`), and Employee (`/employee/timesheet`) in their respective layouts and `App.tsx`
- Set `staleTime: 0` or a polling interval on the shifts query in `EmployeeSchedulePage` and `EmployeeDashboard` so published shifts appear immediately on navigation; filter to only show `#published` shifts on employee-facing pages

**User-visible outcome:** Employees can submit weekly timesheets, managers can approve or deny them, and HR Admins can give final approval or denial. Employees can also instantly see newly published schedules without a page reload.
