# Specification

## Summary
**Goal:** Redesign the employee timesheet page into a modern calendar-style UI and fix timesheet submission errors for employees, managers, and the backend.

**Planned changes:**
- Redesign `EmployeeTimesheetPage.tsx` with a 7-column weekly calendar grid (Sunday–Saturday), where each day is a card containing start time, end time, Building #, and auto-calculated paid hours fields
- Add a summary bar below the calendar showing total paid hours for the week and the break deduction note
- Style the redesigned page with the existing dark navy/amber theme, card elevation, whitespace, and clear typography
- Keep previously submitted timesheets displayed below the calendar as a card list with status badges
- Fix `EmployeeTimesheetPage.tsx` and `useSubmitTimesheet` mutation so `employeeId` is automatically read from `AuthContext` session instead of requiring manual input or causing an error; show an inline warning if `employeeId` is missing
- Fix `ManagerTimesheetPage.tsx` and `useManagerReviewTimesheet` mutation so managers can approve/deny timesheets without an "employee ID" error; ensure the mutation sends only timesheet ID, approved flag, and comment, and correctly maps `#ok`/`#err` backend responses
- Fix the backend `submitTimesheet` endpoint in `main.mo` to accept `employeeId` from the timesheet payload rather than the caller principal
- Fix the backend `managerReviewTimesheet` endpoint to require only `timesheetId`, `approved`, and optional comment — no separate `employeeId`
- Ensure both backend endpoints return well-formed `#ok`/`#err` variants and do not trap on valid input

**User-visible outcome:** Employees see a clean, modern calendar-style timesheet form and can submit timesheets without errors. Managers can approve or deny timesheets without encountering an "employee ID" error. Both actions show success toasts and update the timesheet status immediately.
