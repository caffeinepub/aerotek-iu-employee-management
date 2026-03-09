import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import React from "react";
import { TimeOffStatus } from "../../backend";
import { useActor } from "../../hooks/useActor";

function useEmployees() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllEmployees();
    },
    enabled: !!actor && !isFetching,
  });
}

function useTimeOffRequests() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["timeOffRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTimeOffRequests();
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
  });
}

export default function SupervisorDashboard() {
  const navigate = useNavigate();
  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: timeOffRequests = [], isLoading: torLoading } =
    useTimeOffRequests();

  const pendingRequests = timeOffRequests.filter(
    (r) => r.status === TimeOffStatus.pending,
  );
  const activeEmployees = employees.filter((e) => e.status === "active");

  const kpis = [
    {
      label: "Total Employees",
      value: empLoading ? "—" : activeEmployees.length.toString(),
      icon: Users,
      color: "teal",
      sub: `${employees.length} total`,
    },
    {
      label: "Pending Time Off",
      value: torLoading ? "—" : pendingRequests.length.toString(),
      icon: Clock,
      color: "amber",
      sub: "Awaiting review",
    },
    {
      label: "Total Requests",
      value: torLoading ? "—" : timeOffRequests.length.toString(),
      icon: Calendar,
      color: "orange",
      sub: "All time off requests",
    },
  ];

  const colorMap: Record<
    string,
    { bg: string; border: string; icon: string; badge: string }
  > = {
    teal: {
      bg: "bg-teal-500/10",
      border: "border-teal-500/20",
      icon: "text-teal-400",
      badge: "bg-teal-500/20 text-teal-300",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: "text-amber-400",
      badge: "bg-amber-500/20 text-amber-300",
    },
    orange: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      icon: "text-orange-400",
      badge: "bg-orange-500/20 text-orange-300",
    },
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <TrendingUp className="w-6 h-6 text-teal-400" />
          <h1 className="text-2xl font-bold text-white">
            Supervisor Dashboard
          </h1>
        </div>
        <p className="text-navy-400 text-sm ml-9">
          Overview of your team's activity and requests
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {kpis.map((kpi, i) => {
          const c = colorMap[kpi.color];
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-6 backdrop-blur-sm`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${c.bg} border ${c.border}`}>
                  <Icon className={`w-5 h-5 ${c.icon}`} />
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${c.badge}`}
                >
                  {kpi.sub}
                </span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{kpi.value}</p>
              <p className="text-navy-400 text-sm">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/supervisor/schedules" })}
          className="flex items-center justify-between p-5 bg-navy-800/60 border border-navy-700/50 rounded-2xl hover:border-teal-500/30 hover:bg-navy-800 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <Calendar className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">View Schedules</p>
              <p className="text-navy-400 text-xs">
                Browse weekly shift calendar
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-navy-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          type="button"
          onClick={() => navigate({ to: "/supervisor/time-off" })}
          className="flex items-center justify-between p-5 bg-navy-800/60 border border-navy-700/50 rounded-2xl hover:border-amber-500/30 hover:bg-navy-800 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">
                Time Off Requests
              </p>
              <p className="text-navy-400 text-xs">
                {pendingRequests.length > 0
                  ? `${pendingRequests.length} pending review`
                  : "No pending requests"}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-navy-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Recent Pending Requests */}
      <div className="bg-navy-900/60 border border-navy-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending Time Off Requests
          </h2>
          <button
            type="button"
            onClick={() => navigate({ to: "/supervisor/time-off" })}
            className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {torLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-navy-800/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 text-teal-500/40 mx-auto mb-2" />
            <p className="text-navy-400 text-sm">
              All caught up! No pending requests.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.slice(0, 5).map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 bg-navy-800/40 rounded-xl border border-navy-700/30"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {req.employeeId}
                  </p>
                  <p className="text-navy-400 text-xs">
                    {req.timeOffType} ·{" "}
                    {new Date(Number(req.startDate)).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs rounded-full font-medium">
                  Pending
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
