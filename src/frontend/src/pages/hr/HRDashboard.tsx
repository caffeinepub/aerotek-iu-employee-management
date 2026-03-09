import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import React from "react";
import { EmployeeStatus, JobPostingStatus, TimeOffStatus } from "../../backend";
import StatusBadge from "../../components/StatusBadge";
import {
  useGetAllEmployees,
  useGetAllJobPostings,
  useGetAllTimeOffRequests,
} from "../../hooks/useQueries";
// Inline helper (lib/utils only exports cn)
function formatDate(d: string | bigint | undefined | null): string {
  if (d === undefined || d === null) return "—";
  if (typeof d === "bigint") {
    return new Date(Number(d) / 1_000_000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return new Date(`${d as string}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function HRDashboard() {
  const navigate = useNavigate();
  const { data: employees, isLoading: empLoading } = useGetAllEmployees();
  const { data: postings, isLoading: postLoading } = useGetAllJobPostings();
  const { data: timeOffRequests, isLoading: torLoading } =
    useGetAllTimeOffRequests();

  const activeEmployees =
    employees?.filter((e) => e.status === EmployeeStatus.active) ?? [];
  const openPostings =
    postings?.filter((p) => p.status === JobPostingStatus.open) ?? [];
  const pendingRequests =
    timeOffRequests?.filter((r) => r.status === TimeOffStatus.pending) ?? [];
  const departments = new Set(
    employees?.map((e) => e.department).filter(Boolean),
  );
  const today = new Date();

  const stats = [
    {
      title: "Active Employees",
      value: empLoading ? null : activeEmployees.length,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      link: "/hr/employees",
      linkLabel: "View all employees",
    },
    {
      title: "Open Job Postings",
      value: postLoading ? null : openPostings.length,
      icon: Briefcase,
      color: "text-amber-600",
      bg: "bg-amber-50",
      link: "/hr/hiring",
      linkLabel: "View postings",
    },
    {
      title: "Pending Time Off",
      value: torLoading ? null : pendingRequests.length,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
      link: "/hr/time-off",
      linkLabel: "Review requests",
    },
    {
      title: "Departments",
      value: empLoading ? null : departments.size,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      link: "/hr/employees",
      linkLabel: "View by department",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">
          HR Dashboard
        </h1>
        <p className="text-[oklch(0.52_0.02_250)] text-sm mt-1">
          Welcome back — here's your organization overview for{" "}
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border border-[oklch(0.88_0.01_240)] shadow-card hover:shadow-elevated transition-shadow cursor-pointer"
            onClick={() => navigate({ to: stat.link })}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                    {stat.title}
                  </p>
                  {stat.value === null ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-[oklch(0.18_0.04_255)] mt-1">
                      {stat.value}
                    </p>
                  )}
                </div>
                <div className={`${stat.bg} p-2.5 rounded-lg`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-[oklch(0.52_0.02_250)]">
                <span>{stat.linkLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Time Off */}
        <Card className="border border-[oklch(0.88_0.01_240)] shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)]">
                Pending Time Off Requests
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/hr/time-off" })}
                className="text-xs text-[oklch(0.52_0.02_250)]"
              >
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {torLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <p className="text-sm text-[oklch(0.52_0.02_250)] py-4 text-center">
                No pending requests
              </p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between py-2 border-b border-[oklch(0.94_0.008_240)] last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-[oklch(0.18_0.04_255)]">
                        {req.employeeId}
                      </p>
                      <p className="text-xs text-[oklch(0.52_0.02_250)]">
                        {req.timeOffType} · {formatDate(req.startDate)} –{" "}
                        {formatDate(req.endDate)}
                      </p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-[oklch(0.88_0.01_240)] shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)]">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                label: "Add New Employee",
                path: "/hr/employees/new",
                icon: Users,
                color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
              },
              {
                label: "Create Job Posting",
                path: "/hr/hiring/new",
                icon: Briefcase,
                color: "bg-amber-50 text-amber-700 hover:bg-amber-100",
              },
              {
                label: "Review Time Off Requests",
                path: "/hr/time-off",
                icon: Clock,
                color: "bg-orange-50 text-orange-700 hover:bg-orange-100",
              },
              {
                label: "Manage PTO Policies",
                path: "/hr/pto-policies",
                icon: Calendar,
                color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
              },
            ].map((action) => (
              <button
                type="button"
                key={action.path}
                onClick={() => navigate({ to: action.path })}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${action.color}`}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Employees */}
      <Card className="border border-[oklch(0.88_0.01_240)] shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)]">
              Recent Employees
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/hr/employees" })}
              className="text-xs text-[oklch(0.52_0.02_250)]"
            >
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {empLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !employees?.length ? (
            <p className="text-sm text-[oklch(0.52_0.02_250)] py-4 text-center">
              No employees yet.{" "}
              <button
                type="button"
                onClick={() => navigate({ to: "/hr/employees/new" })}
                className="text-[oklch(0.22_0.04_255)] underline"
              >
                Add one
              </button>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[oklch(0.88_0.01_240)]">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                      Name
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                      Department
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                      Title
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                      Start Date
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.slice(0, 6).map((emp, i) => (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: table row navigation, mouse-only pattern
                    <tr
                      key={emp.id}
                      className={`border-b border-[oklch(0.94_0.008_240)] last:border-0 hover:bg-[oklch(0.97_0.005_240)] cursor-pointer transition-colors ${i % 2 === 1 ? "bg-[oklch(0.985_0.003_240)]" : ""}`}
                      onClick={() =>
                        navigate({
                          to: "/hr/employees/$id",
                          params: { id: emp.id },
                        })
                      }
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[oklch(0.22_0.04_255)] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">
                              {emp.fullName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-[oklch(0.18_0.04_255)]">
                            {emp.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[oklch(0.52_0.02_250)]">
                        {emp.department || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-[oklch(0.52_0.02_250)]">
                        {emp.jobTitle || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-[oklch(0.52_0.02_250)]">
                        {formatDate(emp.startDate)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={emp.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
