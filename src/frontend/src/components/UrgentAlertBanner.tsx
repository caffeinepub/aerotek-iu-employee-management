import { AlertTriangle, X } from "lucide-react";
import React from "react";
import { type Notification, NotificationType } from "../backend";
import { useMarkNotificationRead, useNotifications } from "../hooks/useQueries";

export default function UrgentAlertBanner() {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();

  // Filter for unread urgent alerts, pick the most recent one
  const urgentAlerts = notifications.filter(
    (n: Notification) =>
      !n.isRead && (n.notificationType as string) === "urgentAlert",
  );

  // Sort by id descending as a proxy for recency (createdAt may be 0)
  const mostRecent = urgentAlerts.sort((a, b) => b.id.localeCompare(a.id))[0];

  if (!mostRecent) return null;

  const handleDismiss = () => {
    markRead.mutate(mostRecent.id);
  };

  return (
    <div className="bg-amber-500 text-[oklch(0.15_0.02_255)] px-6 py-3 flex items-start gap-3 flex-shrink-0">
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[oklch(0.15_0.02_255)]" />
      <div className="flex-1">
        <p className="text-sm font-bold leading-snug">
          🚨 Urgent Alert: {mostRecent.message}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        disabled={markRead.isPending}
        className="flex-shrink-0 p-1 rounded hover:bg-amber-600 transition-colors disabled:opacity-50"
        aria-label="Dismiss urgent alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
