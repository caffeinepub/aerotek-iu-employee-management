import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Edit2, FileText, Plus } from "lucide-react";
import React from "react";
import { useGetAllPTOPolicies } from "../../hooks/useQueries";

export default function PTOPoliciesPage() {
  const navigate = useNavigate();
  const { data: policies, isLoading } = useGetAllPTOPolicies();

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">
            PTO Policies
          </h1>
          <p className="text-sm text-[oklch(0.52_0.02_250)] mt-0.5">
            {policies?.length ?? 0} policies defined
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/hr/pto-policies/balances" })}
          >
            View Balances <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            onClick={() => navigate({ to: "/hr/pto-policies/new" })}
            className="bg-[oklch(0.22_0.04_255)] text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Policy
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : policies?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-[oklch(0.88_0.01_240)] text-[oklch(0.52_0.02_250)]">
          <FileText className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">No PTO policies yet</p>
          <p className="text-sm mt-1">
            Create your first policy to get started
          </p>
          <Button
            onClick={() => navigate({ to: "/hr/pto-policies/new" })}
            className="mt-4 bg-[oklch(0.22_0.04_255)] text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Policy
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {policies?.map((policy) => (
            <Card
              key={policy.id}
              className="border border-[oklch(0.88_0.01_240)] shadow-card hover:shadow-elevated transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-semibold text-[oklch(0.18_0.04_255)]">
                    {policy.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/hr/pto-policies/$id/edit",
                        params: { id: policy.id },
                      })
                    }
                    className="h-7 w-7 p-0"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.52_0.02_250)]">
                    Accrual Rate
                  </span>
                  <span className="font-medium text-[oklch(0.18_0.04_255)]">
                    {policy.accrualRate} days/period
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[oklch(0.52_0.02_250)]">
                    Max Carry-Over
                  </span>
                  <span className="font-medium text-[oklch(0.18_0.04_255)]">
                    {policy.maxCarryOver} days
                  </span>
                </div>
                <div className="pt-1">
                  <p className="text-xs text-[oklch(0.52_0.02_250)] mb-1">
                    Eligible Leave Types
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {policy.eligibleLeaveTypes.map((type) => (
                      <span
                        key={type}
                        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
