import { Bell, CheckCheck, X } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { type Notification, NotificationType } from "../backend";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/useQueries";

function getRelativeTime(createdAt: bigint): string {
  // createdAt is 0 for notifications created without a real timestamp in the backend
  // In that case, show "Just now"
  if (!createdAt || createdAt === BigInt(0)) return "Just now";
  const nowMs = Date.now();
  const createdMs = Number(createdAt) / 1_000_000;
  const diffMs = nowMs - createdMs;
  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case "schedulePublished":
      return "📅";
    case "scheduleUnpublished":
      return "📅";
    case "timeOffSubmitted":
      return "📋";
    case "timeOffApproved":
      return "✅";
    case "timeOffDenied":
      return "❌";
    case "urgentAlert":
      return "🚨";
    default:
      return "🔔";
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications.filter(
    (n: Notification) => !n.isRead,
  ).length;

  // Sort notifications: newest first (by id as fallback since createdAt may be 0)
  const sorted = [...notifications].sort((a, b) => {
    if (a.createdAt !== b.createdAt) {
      return Number(b.createdAt) - Number(a.createdAt);
    }
    // Fallback: reverse insertion order by id string comparison
    return b.id.localeCompare(a.id);
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-[oklch(0.52_0.02_250)] hover:bg-[oklch(0.93_0.01_240)] hover:text-[oklch(0.18_0.04_255)] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[oklch(0.18_0.04_255)] border border-[oklch(0.28_0.04_255)] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[oklch(0.28_0.04_255)]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[oklch(0.78_0.16_75)]" />
              <span className="text-white font-semibold text-sm">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markAllRead.isPending}
                  className="flex items-center gap-1 text-[oklch(0.78_0.16_75)] hover:text-white text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[oklch(0.55_0.02_250)] hover:text-white p-1 rounded transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-8 h-8 text-[oklch(0.40_0.02_250)] mb-2" />
                <p className="text-[oklch(0.55_0.02_250)] text-sm">
                  No notifications yet
                </p>
                <p className="text-[oklch(0.40_0.02_250)] text-xs mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              sorted.map((notification: Notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b border-[oklch(0.23_0.04_255)] last:border-b-0 transition-colors hover:bg-[oklch(0.22_0.04_255)] ${
                    !notification.isRead
                      ? "bg-[oklch(0.21_0.05_255)]"
                      : "bg-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base flex-shrink-0 mt-0.5">
                      {getNotificationIcon(
                        notification.notificationType as string,
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug break-words ${
                          !notification.isRead
                            ? "text-white font-medium"
                            : "text-[oklch(0.65_0.02_250)]"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-[oklch(0.45_0.02_250)] text-xs mt-1">
                        {getRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[oklch(0.78_0.16_75)] flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
