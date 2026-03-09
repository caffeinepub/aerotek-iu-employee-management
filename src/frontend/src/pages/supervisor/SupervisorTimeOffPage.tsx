import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { TimeOffStatus } from "../../backend";
import { useActor } from "../../hooks/useActor";

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

export default function SupervisorTimeOffPage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useTimeOffRequests();
  const { data: employees = [] } = useEmployees();

  const [denyModalOpen, setDenyModalOpen] = useState(false);
  const [denyRequestId, setDenyRequestId] = useState<string | null>(null);
  const [denyComment, setDenyComment] = useState("");
  const [denyCommentError, setDenyCommentError] = useState("");
  const [showProcessed, setShowProcessed] = useState(false);

  const pending = requests.filter((r) => r.status === TimeOffStatus.pending);
  const processed = requests.filter((r) => r.status !== TimeOffStatus.pending);

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.fullName : id;
  };

  const approveMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.approveTimeOffRequestWithComment(
        id,
        comment || "Approved by supervisor",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] });
      toast.success("Time off request approved!");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to approve request");
    },
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.denyTimeOffRequest(id, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeOffRequests"] });
      toast.success("Time off request denied.");
      setDenyModalOpen(false);
      setDenyComment("");
      setDenyRequestId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to deny request");
    },
  });

  const openDenyModal = (id: string) => {
    setDenyRequestId(id);
    setDenyComment("");
    setDenyCommentError("");
    setDenyModalOpen(true);
  };

  const handleDenySubmit = () => {
    if (!denyComment.trim()) {
      setDenyCommentError("A reason is required to deny a request.");
      return;
    }
    if (denyRequestId) {
      denyMutation.mutate({ id: denyRequestId, comment: denyComment.trim() });
    }
  };

  const statusBadge = (status: TimeOffStatus) => {
    if (status === TimeOffStatus.approved) {
      return (
        <span className="px-2.5 py-1 bg-green-500/15 border border-green-500/20 text-green-400 text-xs rounded-full font-medium">
          Approved
        </span>
      );
    }
    if (status === TimeOffStatus.denied) {
      return (
        <span className="px-2.5 py-1 bg-red-500/15 border border-red-500/20 text-red-400 text-xs rounded-full font-medium">
          Denied
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/20 text-amber-400 text-xs rounded-full font-medium">
        Pending
      </span>
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-amber-400" />
          <h1 className="text-2xl font-bold text-white">Time Off Requests</h1>
        </div>
        <p className="text-navy-400 text-sm ml-7">
          Review and action employee time off requests
        </p>
      </div>

      {/* Pending Requests */}
      <div className="bg-navy-900/60 border border-navy-700/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-700/30 flex items-center justify-between">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Pending Requests
            {pending.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                {pending.length}
              </span>
            )}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-navy-800/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle className="w-10 h-10 text-teal-500/40 mx-auto mb-2" />
            <p className="text-navy-400 text-sm">No pending requests</p>
          </div>
        ) : (
          <div className="divide-y divide-navy-700/20">
            {pending.map((req) => (
              <div
                key={req.id}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium text-sm">
                      {getEmployeeName(req.employeeId)}
                    </p>
                    <span className="text-navy-500 text-xs">·</span>
                    <span className="text-navy-400 text-xs">
                      {req.timeOffType}
                    </span>
                  </div>
                  <p className="text-navy-400 text-xs">
                    {new Date(Number(req.startDate)).toLocaleDateString()} –{" "}
                    {new Date(Number(req.endDate)).toLocaleDateString()}
                  </p>
                  <p className="text-navy-500 text-xs mt-0.5">
                    Requested:{" "}
                    {new Date(Number(req.requestDate)).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      approveMutation.mutate({
                        id: req.id,
                        comment: "Approved by supervisor",
                      })
                    }
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-500/15 border border-green-500/20 text-green-400 hover:bg-green-500/25 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => openDenyModal(req.id)}
                    disabled={denyMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed Requests */}
      <div className="bg-navy-900/60 border border-navy-700/50 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProcessed((v) => !v)}
          className="w-full px-6 py-4 border-b border-navy-700/30 flex items-center justify-between hover:bg-navy-800/30 transition-colors"
        >
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-navy-500" />
            Processed Requests
            {processed.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-navy-700 text-navy-300 text-xs rounded-full">
                {processed.length}
              </span>
            )}
          </h2>
          {showProcessed ? (
            <ChevronUp className="w-4 h-4 text-navy-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-navy-400" />
          )}
        </button>

        {showProcessed &&
          (processed.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-navy-400 text-sm">No processed requests yet</p>
            </div>
          ) : (
            <div className="divide-y divide-navy-700/20">
              {processed.map((req) => (
                <div
                  key={req.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-medium text-sm">
                        {getEmployeeName(req.employeeId)}
                      </p>
                      <span className="text-navy-500 text-xs">·</span>
                      <span className="text-navy-400 text-xs">
                        {req.timeOffType}
                      </span>
                    </div>
                    <p className="text-navy-400 text-xs">
                      {new Date(Number(req.startDate)).toLocaleDateString()} –{" "}
                      {new Date(Number(req.endDate)).toLocaleDateString()}
                    </p>
                    {req.approverComments && (
                      <p className="text-navy-500 text-xs mt-1 italic">
                        "{req.approverComments}"
                      </p>
                    )}
                  </div>
                  {statusBadge(req.status)}
                </div>
              ))}
            </div>
          ))}
      </div>

      {/* Deny Modal */}
      {denyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-navy-900 border border-navy-700/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-semibold">Deny Request</h3>
            </div>
            <p className="text-navy-400 text-sm mb-4">
              Please provide a reason for denying this time off request.
            </p>
            <textarea
              value={denyComment}
              onChange={(e) => {
                setDenyComment(e.target.value);
                if (e.target.value.trim()) setDenyCommentError("");
              }}
              placeholder="Enter reason for denial..."
              rows={3}
              className="w-full bg-navy-800 border border-navy-700/50 rounded-xl px-4 py-3 text-white text-sm placeholder:text-navy-500 focus:outline-none focus:border-red-500/50 resize-none"
            />
            {denyCommentError && (
              <p className="text-red-400 text-xs mt-1">{denyCommentError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setDenyModalOpen(false);
                  setDenyComment("");
                  setDenyCommentError("");
                }}
                className="flex-1 px-4 py-2.5 bg-navy-800 border border-navy-700/50 text-navy-300 hover:text-white rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDenySubmit}
                disabled={denyMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              >
                {denyMutation.isPending ? "Denying..." : "Confirm Deny"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
