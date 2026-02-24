import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  redirect,
  Outlet,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from 'next-themes';

// Auth
import { getStoredSession } from './hooks/useAuth';

// Layouts
import HRAdminLayout from './layouts/HRAdminLayout';
import ManagerLayout from './layouts/ManagerLayout';
import EmployeeLayout from './layouts/EmployeeLayout';
import SupervisorLayout from './layouts/SupervisorLayout';

// Pages - HR
import HRDashboard from './pages/hr/HRDashboard';
import EmployeesPage from './pages/hr/EmployeesPage';
import AddEmployeePage from './pages/hr/AddEmployeePage';
import EmployeeDetailPage from './pages/hr/EmployeeDetailPage';
import HiringPage from './pages/hr/HiringPage';
import CreateJobPostingPage from './pages/hr/CreateJobPostingPage';
import ApplicantPipelinePage from './pages/hr/ApplicantPipelinePage';
import SchedulingPage from './pages/hr/SchedulingPage';
import TimeOffRequestsPage from './pages/hr/TimeOffRequestsPage';
import PTOPoliciesPage from './pages/hr/PTOPoliciesPage';
import PTOPolicyFormPage from './pages/hr/PTOPolicyFormPage';
import PTOBalancesPage from './pages/hr/PTOBalancesPage';
import AccountManagementPage from './pages/hr/AccountManagementPage';
import HRTimesheetPage from './pages/hr/HRTimesheetPage';

// Pages - Manager
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerTeamPage from './pages/manager/ManagerTeamPage';
import ManagerSchedulingPage from './pages/manager/ManagerSchedulingPage';
import ManagerTimeOffPage from './pages/manager/ManagerTimeOffPage';
import ManagerAccountManagementPage from './pages/manager/ManagerAccountManagementPage';
import ManagerTimesheetPage from './pages/manager/ManagerTimesheetPage';

// Pages - Employee
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeSchedulePage from './pages/employee/EmployeeSchedulePage';
import EmployeeTimeOffPage from './pages/employee/EmployeeTimeOffPage';
import EmployeeTimesheetPage from './pages/employee/EmployeeTimesheetPage';

// Pages - Supervisor
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import SupervisorSchedulePage from './pages/supervisor/SupervisorSchedulePage';
import SupervisorTimeOffPage from './pages/supervisor/SupervisorTimeOffPage';

// Login
import LoginPage from './pages/LoginPage';

const queryClient = new QueryClient();

// ===== Root Route =====
const rootRoute = createRootRoute({
  component: () => (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  ),
});

// ===== Login Route =====
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

// ===== Index Route =====
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    const session = getStoredSession();
    if (!session) throw redirect({ to: '/login' });
    switch (session.role) {
      case 'hrAdmin':
        throw redirect({ to: '/hr' });
      case 'manager':
        throw redirect({ to: '/manager' });
      case 'employee':
        throw redirect({ to: '/employee' });
      case 'supervisor':
        throw redirect({ to: '/supervisor/dashboard' });
      default:
        throw redirect({ to: '/login' });
    }
  },
  component: () => null,
});

// ===== HR Admin Routes =====
const hrLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hr',
  beforeLoad: () => {
    const session = getStoredSession();
    if (!session || session.role !== 'hrAdmin') throw redirect({ to: '/login' });
  },
  component: HRAdminLayout,
});

const hrIndexRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/',
  component: HRDashboard,
});

const hrEmployeesRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/employees',
  component: EmployeesPage,
});

const hrEmployeeNewRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/employees/new',
  component: AddEmployeePage,
});

const hrEmployeeDetailRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/employees/$id',
  component: EmployeeDetailPage,
});

const hrHiringRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/hiring',
  component: HiringPage,
});

const hrHiringNewRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/hiring/new',
  component: CreateJobPostingPage,
});

const hrHiringPipelineRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/hiring/$postingId/pipeline',
  component: ApplicantPipelinePage,
});

const hrSchedulingRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/scheduling',
  component: SchedulingPage,
});

const hrTimeOffRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/time-off',
  component: TimeOffRequestsPage,
});

const hrTimesheetsRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/timesheets',
  component: HRTimesheetPage,
});

const hrPTOPoliciesRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/pto-policies',
  component: PTOPoliciesPage,
});

const hrPTOPoliciesNewRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/pto-policies/new',
  component: PTOPolicyFormPage,
});

const hrPTOPoliciesEditRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/pto-policies/$id/edit',
  component: PTOPolicyFormPage,
});

const hrPTOBalancesRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/pto-policies/balances',
  component: PTOBalancesPage,
});

const hrAccountsRoute = createRoute({
  getParentRoute: () => hrLayoutRoute,
  path: '/accounts',
  component: AccountManagementPage,
});

// ===== Manager Routes =====
const managerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manager',
  beforeLoad: () => {
    const session = getStoredSession();
    if (!session || session.role !== 'manager') throw redirect({ to: '/login' });
  },
  component: ManagerLayout,
});

const managerIndexRoute = createRoute({
  getParentRoute: () => managerLayoutRoute,
  path: '/',
  component: ManagerDashboard,
});

const managerTeamRoute = createRoute({
  getParentRoute: () => managerLayoutRoute,
  path: '/team',
  component: ManagerTeamPage,
});

const managerSchedulingRoute = createRoute({
  getParentRoute: () => managerLayoutRoute,
  path: '/scheduling',
  component: ManagerSchedulingPage,
});

const managerTimeOffRoute = createRoute({
  getParentRoute: () => managerLayoutRoute,
  path: '/time-off',
  component: ManagerTimeOffPage,
});

const managerTimesheetsRoute = createRoute({
  getParentRoute: () => managerLayoutRoute,
  path: '/timesheets',
  component: ManagerTimesheetPage,
});

const managerAccountsRoute = createRoute({
  getParentRoute: () => managerLayoutRoute,
  path: '/accounts',
  component: ManagerAccountManagementPage,
});

// ===== Employee Routes =====
const employeeLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/employee',
  beforeLoad: () => {
    const session = getStoredSession();
    if (!session || session.role !== 'employee') throw redirect({ to: '/login' });
  },
  component: EmployeeLayout,
});

const employeeIndexRoute = createRoute({
  getParentRoute: () => employeeLayoutRoute,
  path: '/',
  component: EmployeeDashboard,
});

const employeeScheduleRoute = createRoute({
  getParentRoute: () => employeeLayoutRoute,
  path: '/schedule',
  component: EmployeeSchedulePage,
});

const employeeTimesheetRoute = createRoute({
  getParentRoute: () => employeeLayoutRoute,
  path: '/timesheet',
  component: EmployeeTimesheetPage,
});

const employeeTimeOffRoute = createRoute({
  getParentRoute: () => employeeLayoutRoute,
  path: '/time-off',
  component: EmployeeTimeOffPage,
});

// ===== Supervisor Routes =====
const supervisorLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/supervisor',
  beforeLoad: () => {
    const session = getStoredSession();
    if (!session || session.role !== 'supervisor') throw redirect({ to: '/login' });
  },
  component: SupervisorLayout,
});

const supervisorIndexRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/supervisor/dashboard' });
  },
  component: () => null,
});

const supervisorDashboardRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/dashboard',
  component: SupervisorDashboard,
});

const supervisorSchedulesRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/schedules',
  component: SupervisorSchedulePage,
});

const supervisorTimeOffRoute = createRoute({
  getParentRoute: () => supervisorLayoutRoute,
  path: '/time-off',
  component: SupervisorTimeOffPage,
});

// ===== Catch-all =====
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  beforeLoad: () => {
    throw redirect({ to: '/' });
  },
  component: () => null,
});

// ===== Route Tree =====
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  hrLayoutRoute.addChildren([
    hrIndexRoute,
    hrEmployeesRoute,
    hrEmployeeNewRoute,
    hrEmployeeDetailRoute,
    hrHiringRoute,
    hrHiringNewRoute,
    hrHiringPipelineRoute,
    hrSchedulingRoute,
    hrTimeOffRoute,
    hrTimesheetsRoute,
    hrPTOPoliciesRoute,
    hrPTOPoliciesNewRoute,
    hrPTOPoliciesEditRoute,
    hrPTOBalancesRoute,
    hrAccountsRoute,
  ]),
  managerLayoutRoute.addChildren([
    managerIndexRoute,
    managerTeamRoute,
    managerSchedulingRoute,
    managerTimeOffRoute,
    managerTimesheetsRoute,
    managerAccountsRoute,
  ]),
  employeeLayoutRoute.addChildren([
    employeeIndexRoute,
    employeeScheduleRoute,
    employeeTimesheetRoute,
    employeeTimeOffRoute,
  ]),
  supervisorLayoutRoute.addChildren([
    supervisorIndexRoute,
    supervisorDashboardRoute,
    supervisorSchedulesRoute,
    supervisorTimeOffRoute,
  ]),
  catchAllRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
