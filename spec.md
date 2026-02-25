# Specification

## Summary
**Goal:** Fix the "Something went wrong" startup crash affecting both the frontend and backend of the Aerotek IU Employee Management app.

**Planned changes:**
- Audit and fix the Motoko backend (`backend/main.mo`) for runtime initialization errors, ensuring stable variable declarations, consistent type definitions (Employee with `directManagerId`, Shift with `scheduleStatus`, Timesheet), pre-seeded admin accounts (`richaadi0` and `Adirich`), and post-upgrade hooks all initialize without trapping.
- Fix frontend startup crash in `App.tsx`, `AuthContext.tsx`, `useActor.ts`, and `useQueries.ts` by resolving null/undefined actor access, broken route imports, sessionStorage errors, and QueryClient configuration issues; add error boundaries where needed.
- Resolve all TypeScript compilation errors related to `directManagerId`, `scheduleStatus`, and Timesheet types across all affected page components and hooks so the Vite build completes successfully.

**User-visible outcome:** The application loads to the login page without any crash screen, and both pre-seeded admin accounts remain functional.
