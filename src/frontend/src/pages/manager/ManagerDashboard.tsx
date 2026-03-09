import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  UserCog,
  Users,
} from "lucide-react";
import React from "react";
import { EmployeeStatus, TimeOffStatus } from "../../backend";
import {
  useGetAllEmployees,
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

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { data: employees, isLoading: empLoading } = useGetAllEmployees();
  const { data: timeOffRequests, isLoading: torLoading } =
    useGetAllTimeOffRequests();

  const activeEmployees =
    employees?.filter((e) => e.status === EmployeeStatus.active) ?? [];
  const pendingRequests =
    timeOffRequests?.filter((r) => r.status === TimeOffStatus.pending) ?? [];
  const today = new Date();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">
          Manager Dashboard
        </h1>
        <p className="text-[oklch(0.52_0.02_250)] text-sm mt-1">
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card
          className="border border-[oklch(0.88_0.01_240)] shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
          onClick={() => navigate({ to: "/manager/team" })}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  Active Team Members
                </p>
                {empLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-[oklch(0.18_0.04_255)] mt-1">
                    {activeEmployees.length}
                  </p>
                )}
              </div>
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-[oklch(0.52_0.02_250)]">
              <span>View team directory</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="border border-[oklch(0.88_0.01_240)] shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
          onClick={() => navigate({ to: "/manager/scheduling" })}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  Scheduling
                </p>
                <p className="text-3xl font-bold text-[oklch(0.18_0.04_255)] mt-1">
                  —
                </p>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-lg">
                <Calendar className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-[oklch(0.52_0.02_250)]">
              <span>Manage shifts</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="border border-[oklch(0.88_0.01_240)] shadow-card cursor-pointer hover:shadow-elevated transition-shadow"
          onClick={() => navigate({ to: "/manager/time-off" })}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                  Pending Approvals
                </p>
                {torLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-[oklch(0.18_0.04_255)] mt-1">
                    {pendingRequests.length}
                  </p>
                )}
              </div>
              <div className="bg-amber-50 p-2.5 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-[oklch(0.52_0.02_250)]">
              <span>Review requests</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Time Off */}
        <Card className="border border-[oklch(0.88_0.01_240)] shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)]">
                Pending Time Off
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/manager/time-off" })}
                className="text-xs"
              >
                View all <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {torLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-[oklch(0.52_0.02_250)]">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <p className="text-sm">All caught up — no pending requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between py-2 border-b border-[oklch(0.94_0.008_240)] last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-[oklch(0.18_0.04_255)]">
                        {req.employeeId}
                      </p>
                      <p className="text-xs text-[oklch(0.52_0.02_250)]">
                        {req.timeOffType} · {formatDate(req.startDate)}
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
                label: "View Team Directory",
                path: "/manager/team",
                icon: Users,
                color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
              },
              {
                label: "Manage Schedule",
                path: "/manager/scheduling",
                icon: Calendar,
                color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
              },
              {
                label: "Review Time Off Requests",
                path: "/manager/time-off",
                icon: Clock,
                color: "bg-amber-50 text-amber-700 hover:bg-amber-100",
              },
              {
                label: "Account Management",
                path: "/manager/accounts",
                icon: UserCog,
                color: "bg-purple-50 text-purple-700 hover:bg-purple-100",
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
    </div>
  );
}
