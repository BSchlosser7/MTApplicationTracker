"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { School } from "@/lib/types";
import { upcomingDeadlines, overdueDeadlines } from "@/lib/deadlines";
import { fetcher } from "@/lib/fetcher";

const NOTIFIED_KEY = "mt-tracker-notified-deadlines";

function getNotified(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markNotified(keys: string[]) {
  const existing = getNotified();
  keys.forEach((k) => existing.add(k));
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...existing]));
}

export default function DeadlineNotifier() {
  const { data: schools } = useSWR<School[]>("/api/schools", fetcher, {
    refreshInterval: 60_000,
  });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef(false);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!schools || askedRef.current) return;
    askedRef.current = true;

    if (typeof window === "undefined" || !("Notification" in window)) return;

    const urgent = upcomingDeadlines(schools, 3);
    if (urgent.length === 0) return;

    const notified = getNotified();
    const todayKeyPrefix = new Date().toISOString().slice(0, 10);
    const fresh = urgent.filter(
      (d) => !notified.has(`${d.schoolId}-${d.type}-${d.date}-${todayKeyPrefix}`)
    );
    if (fresh.length === 0) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") fireNotifications(fresh);
      });
    } else if (Notification.permission === "granted") {
      fireNotifications(fresh);
    }

    function fireNotifications(list: typeof fresh) {
      list.forEach((d) => {
        new Notification(`${d.schoolName} — ${d.type} deadline`, {
          body:
            d.daysUntil === 0
              ? "Due today"
              : `Due in ${d.daysUntil} day${d.daysUntil === 1 ? "" : "s"} (${d.date.slice(0, 10)})`,
          tag: `${d.schoolId}-${d.type}`,
        });
      });
      markNotified(
        list.map((d) => `${d.schoolId}-${d.type}-${d.date}-${todayKeyPrefix}`)
      );
    }
  }, [schools]);

  if (!schools) return null;

  const upcoming = upcomingDeadlines(schools, 14);
  const overdue = overdueDeadlines(schools);
  const urgentCount = upcomingDeadlines(schools, 3).length + overdue.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
        aria-label="Deadline notifications"
      >
        <BellIcon />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {urgentCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg py-2">
          <div className="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            Deadlines
          </div>
          {overdue.length === 0 && upcoming.length === 0 && (
            <div className="px-3 py-4 text-sm text-zinc-500">
              Nothing due in the next 14 days.
            </div>
          )}
          {overdue.map((d) => (
            <Link
              key={`overdue-${d.schoolId}-${d.type}`}
              href={`/schools/${d.schoolId}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div className="font-medium text-red-600">{d.schoolName}</div>
              <div className="text-xs text-zinc-500">
                {d.type} deadline — overdue ({d.date.slice(0, 10)})
              </div>
            </Link>
          ))}
          {upcoming.map((d) => (
            <Link
              key={`upcoming-${d.schoolId}-${d.type}`}
              href={`/schools/${d.schoolId}`}
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <div className="font-medium">{d.schoolName}</div>
              <div className="text-xs text-zinc-500">
                {d.type} deadline —{" "}
                {d.daysUntil === 0 ? "today" : `in ${d.daysUntil}d`} (
                {d.date.slice(0, 10)})
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="w-5 h-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
      />
    </svg>
  );
}
