# Specification

## Summary
**Goal:** Fix the crash that occurs when an HR Admin clicks the "Add Staff" button on the staff management page.

**Planned changes:**
- Fix runtime errors in `AddEmployeePage.tsx` including null/undefined actor access, type mismatches on `directManagerId`, broken form field bindings, and missing component references.
- Ensure the Direct Manager dropdown populates correctly without throwing runtime errors.
- Fix the `useCreateEmployeeWithAccount` mutation hook in `useQueries.ts` to guard against null/undefined actor, correctly handle `#ok`/`#err` backend response variants, and invalidate the employees query cache on success.
- Ensure form validation shows inline errors for empty required fields without crashing.
- Ensure successful submission shows a success toast and navigates back to the employee list.
- Resolve all TypeScript compilation errors in `AddEmployeePage.tsx`.

**User-visible outcome:** HR Admins can open the Add Staff form, fill in all fields including the Direct Manager dropdown, and successfully submit the form without any crashes or unhandled errors.
