import React, { Suspense, lazy } from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, getStoredSession } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));

// HR Pages
const HRDashboard = lazy(() => import('./pages/hr/HRDashboard'));
const EmployeesPage = lazy(() => import('./pages/hr/EmployeesPage'));
const AddEmployeePage = lazy(() => import('./pages/hr/AddEmployeePage'));
const EmployeeDetailPage = lazy(() => import('./pages/hr/EmployeeDetailPage'));
const SchedulingPage = lazy(() => import('./pages/hr/SchedulingPage'));
const TimeOffRequestsPage = lazy(() => import('./pages/hr/TimeOffRequestsPage'));
const HiringPage = lazy(() => import('./pages/hr/HiringPage'));
const CreateJobPostingPage = lazy(() => import('./pages/hr/CreateJobPostingPage'));
const ApplicantPipelinePage = lazy(() => import('./pages/hr/ApplicantPipelinePage'));
const PTOPoliciesPage = lazy(() => import('./pages/hr/PTOPoliciesPage'));
const PTOPolicyFormPage = lazy(() => import('./pages/hr/PTOPolicyFormPage'));
const PTOBalancesPage = lazy(() => import('./pages/hr/PTOBalancesPage'));
const AccountManagementPage = lazy(() => import('./pages/hr/AccountManagementPage'));
const HRTimesheetPage = lazy(() => import('./pages/hr/HRTimesheetPage'));

// Manager Pages
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const ManagerTeamPage = lazy(() => import('./pages/manager/ManagerTeamPage'));
const ManagerSchedulingPage = lazy(() => import('./pages/manager/ManagerSchedulingPage'));
const ManagerTimeOffPage = lazy(() => import('./pages/manager/ManagerTimeOffPage'));
const ManagerAccountManagementPage = lazy(() => import('./pages/manager/ManagerAccountManagementPage'));
const ManagerTimesheetPage = lazy(() => import('./pages/manager/ManagerTimesheetPage'));

// Employee Pages
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const EmployeeSchedulePage = lazy(() => import('./pages/employee/EmployeeSchedulePage'));
const EmployeeTimeOffPage = lazy(() => import('./pages/employee/EmployeeTimeOffPage'));
const EmployeeTimesheetPage = lazy(() => import('./pages/employee/EmployeeTimesheetPage'));

// Supervisor Pages
const SupervisorDashboard = lazy(() => import('./pages/supervisor/SupervisorDashboard'));
const SupervisorSchedulePage = lazy(() => import('./pages/supervisor/SupervisorSchedulePage'));
const SupervisorTimeOffPage = lazy(() => import('./pages/supervisor/SupervisorTimeOffPage'));

// Layouts
const HRAdminLayout = lazy(() => import('./layouts/HRAdminLayout'));
const ManagerLayout = lazy(() => import('./layouts/ManagerLayout'));
const EmployeeLayout = lazy(() => import('./layouts/EmployeeLayout'));
const SupervisorLayout = lazy(() => import('./layouts/SupervisorLayout'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function getSession() {
  try {
    return getStoredSession();
  } catch {
    return null;
  }
}

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  ),
});

// Login / index route
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <LoginPage />,
  beforeLoad: () => {
    try {
      const session = getSession();
      if (session) {
        const role = session.role;
        if (role === 'hrAdmin') throw redirect({ to: '/hr' });
        if (role === 'manager') throw redirect({ to: '/manager' });
        if (role === 'employee') throw redirect({ to: '/employee' });
        if (role === 'supervisor') throw redirect({ to: '/supervisor' });
      }
    } catch (err) {
      // Re-throw redirects, swallow other errors
      if (err && typeof err === 'object' && 'href' in err) throw err;
    }
  },
});

// ===== HR Routes =====
const hrLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/hr',
  component: () => <HRAdminLayout />,
  beforeLoad: () => {
    try {
      const session = getSession();
      if (!session || session.role !== 'hrAdmin') throw redirect({ to: '/' });
    } catch (err) {
      if (err && typeof err === 'object' && 'href' in err) throw err;
      throw redirect({ to: '/' });
    }
  },
});

const hrDashboardRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/', component: () => <HRDashboard /> });
const hrEmployeesRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/employees', component: () => <EmployeesPage /> });
const hrAddEmployeeRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/employees/new', component: () => <AddEmployeePage /> });
const hrEmployeeDetailRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/employees/$id', component: () => <EmployeeDetailPage /> });
const hrSchedulingRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/scheduling', component: () => <SchedulingPage /> });
const hrTimeOffRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/time-off', component: () => <TimeOffRequestsPage /> });
const hrHiringRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/hiring', component: () => <HiringPage /> });
const hrCreateJobPostingRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/hiring/new', component: () => <CreateJobPostingPage /> });
const hrApplicantPipelineRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/hiring/$postingId/pipeline', component: () => <ApplicantPipelinePage /> });
const hrPTOPoliciesRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/pto-policies', component: () => <PTOPoliciesPage /> });
const hrPTOPolicyNewRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/pto-policies/new', component: () => <PTOPolicyFormPage /> });
const hrPTOPolicyEditRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/pto-policies/$id/edit', component: () => <PTOPolicyFormPage /> });
const hrPTOBalancesRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/pto-policies/balances', component: () => <PTOBalancesPage /> });
const hrAccountManagementRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/accounts', component: () => <AccountManagementPage /> });
const hrTimesheetsRoute = createRoute({ getParentRoute: () => hrLayoutRoute, path: '/timesheets', component: () => <HRTimesheetPage /> });

// ===== Manager Routes =====
const managerLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manager',
  component: () => <ManagerLayout />,
  beforeLoad: () => {
    try {
      const session = getSession();
      if (!session || session.role !== 'manager') throw redirect({ to: '/' });
    } catch (err) {
      if (err && typeof err === 'object' && 'href' in err) throw err;
      throw redirect({ to: '/' });
    }
  },
});

const managerDashboardRoute = createRoute({ getParentRoute: () => managerLayoutRoute, path: '/', component: () => <ManagerDashboard /> });
const managerTeamRoute = createRoute({ getParentRoute: () => managerLayoutRoute, path: '/team', component: () => <ManagerTeamPage /> });
const managerSchedulingRoute = createRoute({ getParentRoute: () => managerLayoutRoute, path: '/scheduling', component: () => <ManagerSchedulingPage /> });
const managerTimeOffRoute = createRoute({ getParentRoute: () => managerLayoutRoute, path: '/time-off', component: () => <ManagerTimeOffPage /> });
const managerAccountManagementRoute = createRoute({ getParentRoute: () => managerLayoutRoute, path: '/accounts', component: () => <ManagerAccountManagementPage /> });
const managerTimesheetsRoute = createRoute({ getParentRoute: () => managerLayoutRoute, path: '/timesheets', component: () => <ManagerTimesheetPage /> });

// ===== Employee Routes =====
const employeeLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/employee',
  component: () => <EmployeeLayout />,
  beforeLoad: () => {
    try {
      const session = getSession();
      if (!session || session.role !== 'employee') throw redirect({ to: '/' });
    } catch (err) {
      if (err && typeof err === 'object' && 'href' in err) throw err;
      throw redirect({ to: '/' });
    }
  },
});

const employeeDashboardRoute = createRoute({ getParentRoute: () => employeeLayoutRoute, path: '/', component: () => <EmployeeDashboard /> });
const employeeScheduleRoute = createRoute({ getParentRoute: () => employeeLayoutRoute, path: '/schedule', component: () => <EmployeeSchedulePage /> });
const employeeTimeOffRoute = createRoute({ getParentRoute: () => employeeLayoutRoute, path: '/time-off', component: () => <EmployeeTimeOffPage /> });
const employeeTimesheetRoute = createRoute({ getParentRoute: () => employeeLayoutRoute, path: '/timesheet', component: () => <EmployeeTimesheetPage /> });

// ===== Supervisor Routes =====
const supervisorLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/supervisor',
  component: () => <SupervisorLayout />,
  beforeLoad: () => {
    try {
      const session = getSession();
      if (!session || session.role !== 'supervisor') throw redirect({ to: '/' });
    } catch (err) {
      if (err && typeof err === 'object' && 'href' in err) throw err;
      throw redirect({ to: '/' });
    }
  },
});

const supervisorDashboardRoute = createRoute({ getParentRoute: () => supervisorLayoutRoute, path: '/', component: () => <SupervisorDashboard /> });
const supervisorScheduleRoute = createRoute({ getParentRoute: () => supervisorLayoutRoute, path: '/schedules', component: () => <SupervisorSchedulePage /> });
const supervisorTimeOffRoute = createRoute({ getParentRoute: () => supervisorLayoutRoute, path: '/time-off', component: () => <SupervisorTimeOffPage /> });

const routeTree = rootRoute.addChildren([
  loginRoute,
  hrLayoutRoute.addChildren([
    hrDashboardRoute,
    hrEmployeesRoute,
    hrAddEmployeeRoute,
    hrEmployeeDetailRoute,
    hrSchedulingRoute,
    hrTimeOffRoute,
    hrHiringRoute,
    hrCreateJobPostingRoute,
    hrApplicantPipelineRoute,
    hrPTOPoliciesRoute,
    hrPTOPolicyNewRoute,
    hrPTOPolicyEditRoute,
    hrPTOBalancesRoute,
    hrAccountManagementRoute,
    hrTimesheetsRoute,
  ]),
  managerLayoutRoute.addChildren([
    managerDashboardRoute,
    managerTeamRoute,
    managerSchedulingRoute,
    managerTimeOffRoute,
    managerAccountManagementRoute,
    managerTimesheetsRoute,
  ]),
  employeeLayoutRoute.addChildren([
    employeeDashboardRoute,
    employeeScheduleRoute,
    employeeTimeOffRoute,
    employeeTimesheetRoute,
  ]),
  supervisorLayoutRoute.addChildren([
    supervisorDashboardRoute,
    supervisorScheduleRoute,
    supervisorTimeOffRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  defaultErrorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Error</h1>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  ),
  defaultNotFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-4">The page you are looking for does not exist.</p>
        <button
          onClick={() => (window.location.href = '/')}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  ),
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
