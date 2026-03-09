import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Notification } from "../backend";
import { useNotifications } from "./useQueries";

/**
 * Detects newly arrived unread notifications by comparing the current fetch
 * result with the previously seen notification IDs. Triggers a toast popup
 * for each new notification. Must be called inside a layout component.
 */
export function useNotificationToasts() {
  const { data: notifications } = useNotifications();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!notifications) return;

    if (!initializedRef.current) {
      // On first load, mark all existing notifications as "seen" so we don't
      // spam toasts for historical notifications on login.
      for (const n of notifications) {
        seenIdsRef.current.add(n.id);
      }
      initializedRef.current = true;
      return;
    }

    // On subsequent polls, find notifications we haven't seen yet
    for (const n of notifications) {
      if (!seenIdsRef.current.has(n.id) && !n.isRead) {
        seenIdsRef.current.add(n.id);
        toast(n.message, {
          duration: 5000,
          description: getNotificationTypeLabel(n.notificationType as string),
        });
      }
    }
  }, [notifications]);
}

function getNotificationTypeLabel(type: string): string {
  switch (type) {
    case "schedulePublished":
      return "Schedule Published";
    case "scheduleUnpublished":
      return "Schedule Unpublished";
    case "timeOffSubmitted":
      return "Time Off Request";
    case "timeOffApproved":
      return "Time Off Approved";
    case "timeOffDenied":
      return "Time Off Denied";
    case "urgentAlert":
      return "🚨 Urgent Alert";
    default:
      return "Notification";
  }
}
