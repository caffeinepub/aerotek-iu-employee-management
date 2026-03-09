import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "badge-pending" },
  approved: { label: "Approved", className: "badge-approved" },
  denied: { label: "Denied", className: "badge-denied" },
  open: { label: "Open", className: "badge-open" },
  closed: { label: "Closed", className: "badge-closed" },
  draft: { label: "Draft", className: "badge-draft" },
  hired: { label: "Hired", className: "badge-hired" },
  rejected: { label: "Rejected", className: "badge-rejected" },
  applied: { label: "Applied", className: "badge-applied" },
  screening: { label: "Screening", className: "badge-screening" },
  interview: { label: "Interview", className: "badge-interview" },
  offer: { label: "Offer", className: "badge-offer" },
  active: { label: "Active", className: "badge-active" },
  inactive: { label: "Inactive", className: "badge-inactive" },
  terminated: { label: "Terminated", className: "badge-terminated" },
  hrAdmin: {
    label: "HR Admin",
    className: "bg-purple-100 text-purple-800 border border-purple-200",
  },
  manager: {
    label: "Manager",
    className: "bg-blue-100 text-blue-800 border border-blue-200",
  },
  employee: {
    label: "Employee",
    className: "bg-gray-100 text-gray-700 border border-gray-200",
  },
};

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700 border border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
