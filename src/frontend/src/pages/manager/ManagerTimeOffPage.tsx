import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { TimeOffStatus } from "../../backend";
import StatusBadge from "../../components/StatusBadge";
import {
  useApproveTimeOffRequest,
  useDenyTimeOffRequest,
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

export default function ManagerTimeOffPage() {
  const { data: requests, isLoading } = useGetAllTimeOffRequests();
  const approve = useApproveTimeOffRequest();
  const deny = useDenyTimeOffRequest();
  const [denyModal, setDenyModal] = useState<{ id: string } | null>(null);
  const [denyComment, setDenyComment] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pending =
    requests?.filter((r) => r.status === TimeOffStatus.pending) ?? [];
  const processed =
    requests?.filter((r) => r.status !== TimeOffStatus.pending) ?? [];

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approve.mutateAsync({ id });
      toast.success("Request approved");
    } catch {
      toast.error("Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async () => {
    if (!denyModal || !denyComment.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    try {
      await deny.mutateAsync({ id: denyModal.id, comment: denyComment });
      toast.success("Request denied");
      setDenyModal(null);
      setDenyComment("");
    } catch {
      toast.error("Failed to deny request");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[oklch(0.18_0.04_255)]">
          Time Off Requests
        </h1>
        <p className="text-sm text-[oklch(0.52_0.02_250)] mt-0.5">
          {pending.length} pending approval
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[oklch(0.88_0.01_240)] shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[oklch(0.88_0.01_240)] bg-[oklch(0.97_0.005_240)]">
              <h2 className="font-semibold text-sm text-[oklch(0.18_0.04_255)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" /> Pending (
                {pending.length})
              </h2>
            </div>
            {pending.length === 0 ? (
              <p className="text-sm text-[oklch(0.52_0.02_250)] py-8 text-center">
                No pending requests
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[oklch(0.88_0.01_240)]">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                        Employee
                      </th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                        Type
                      </th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                        Dates
                      </th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((req, i) => (
                      <tr
                        key={req.id}
                        className={`border-b border-[oklch(0.94_0.008_240)] last:border-0 ${i % 2 === 1 ? "bg-[oklch(0.985_0.003_240)]" : ""}`}
                      >
                        <td className="py-3 px-4 font-medium text-[oklch(0.18_0.04_255)]">
                          {req.employeeId}
                        </td>
                        <td className="py-3 px-4 text-[oklch(0.35_0.02_250)]">
                          {req.timeOffType}
                        </td>
                        <td className="py-3 px-4 text-[oklch(0.52_0.02_250)]">
                          {formatDate(req.startDate)} –{" "}
                          {formatDate(req.endDate)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req.id)}
                              disabled={processingId === req.id}
                              className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              {processingId === req.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setDenyModal({ id: req.id });
                                setDenyComment("");
                              }}
                              disabled={processingId === req.id}
                              className="h-7 px-3 text-xs"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> Deny
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {processed.length > 0 && (
            <div className="bg-white rounded-xl border border-[oklch(0.88_0.01_240)] shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-[oklch(0.88_0.01_240)] bg-[oklch(0.97_0.005_240)]">
                <h2 className="font-semibold text-sm text-[oklch(0.18_0.04_255)]">
                  Processed ({processed.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[oklch(0.88_0.01_240)]">
                    <tr>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                        Employee
                      </th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                        Type
                      </th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                        Dates
                      </th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[oklch(0.52_0.02_250)] uppercase tracking-wide">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processed.map((req, i) => (
                      <tr
                        key={req.id}
                        className={`border-b border-[oklch(0.94_0.008_240)] last:border-0 ${i % 2 === 1 ? "bg-[oklch(0.985_0.003_240)]" : ""}`}
                      >
                        <td className="py-3 px-4 font-medium text-[oklch(0.18_0.04_255)]">
                          {req.employeeId}
                        </td>
                        <td className="py-3 px-4 text-[oklch(0.35_0.02_250)]">
                          {req.timeOffType}
                        </td>
                        <td className="py-3 px-4 text-[oklch(0.52_0.02_250)]">
                          {formatDate(req.startDate)} –{" "}
                          {formatDate(req.endDate)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={req.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!denyModal}
        onOpenChange={(open) => {
          if (!open) setDenyModal(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Time Off Request</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-sm font-medium">Reason for Denial *</Label>
            <Input
              value={denyComment}
              onChange={(e) => setDenyComment(e.target.value)}
              placeholder="Please provide a reason..."
              className="mt-1 h-9"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyModal(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={deny.isPending}
            >
              {deny.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Deny Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
