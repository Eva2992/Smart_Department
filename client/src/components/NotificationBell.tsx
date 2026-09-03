import { useState, useEffect, useRef } from "react";
import { fetchUnreadCount } from "../api/notifications.js";
import { NotificationPanel } from "./NotificationPanel.js";
import { useAuth } from "../context/useAuth.js";

/**
 * Notification bell icon with unread badge count (FR-31).
 * Polls every 30 seconds for updated unread count.
 */
export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Load and poll unread count
  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    const loadCount = async () => {
      try {
        const count = await fetchUnreadCount();
        if (mounted) setUnreadCount(count);
      } catch {
        // Silently fail for polling
      }
    };

    loadCount();
    const interval = setInterval(loadCount, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Close panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => setIsOpen((prev) => !prev);

  const handleCountUpdate = (newCount: number) => {
    setUnreadCount(newCount);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={bellRef}>
      <button
        id="notification-bell"
        onClick={handleToggle}
        className="relative p-2 text-[#1F2937] hover:text-[#DC143C] hover:bg-[#DC143C]/5 rounded-xl transition-all cursor-pointer"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        {/* Bell SVG Icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#DC143C] text-white text-[10px] font-bold rounded-full px-1 shadow-sm animate-[pulse_2s_ease-in-out_infinite]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel Dropdown */}
      {isOpen && (
        <NotificationPanel
          onClose={() => setIsOpen(false)}
          onCountUpdate={handleCountUpdate}
        />
      )}
    </div>
  );
}
