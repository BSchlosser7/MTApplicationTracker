"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { School, Status } from "@/lib/types";
import { STATUS_OPTIONS } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import StatusBadge from "@/components/StatusBadge";
import DeadlinePill from "@/components/DeadlinePill";
import { differenceInCalendarDays, parseISO } from "date-fns";

export default function SchoolsPage() {
  const { data: schools, isLoading } = useSWR<School[]>(
    "/api/schools",
    fetcher
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");

  const filtered = useMemo(() => {
    if (!schools) return [];
    return schools.filter((s) => {
      const matchesQuery = s.name.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [schools, query, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Schools</h1>
        <Link
          href="/schools/new"
          className="px-3 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90"
        >
          + Add School
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search schools…"
          className="flex-1 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "All")}
          className="px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
        >
          <option value="All">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading || !schools ? (
        <div className="text-sm text-zinc-500">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-zinc-500">No schools match.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const today = new Date();
            const appDays = s.applicationDeadline
              ? differenceInCalendarDays(parseISO(s.applicationDeadline), today)
              : null;
            const preDays = s.prescreenDeadline
              ? differenceInCalendarDays(parseISO(s.prescreenDeadline), today)
              : null;
            return (
              <Link
                key={s.id}
                href={`/schools/${s.id}`}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-medium leading-snug">{s.name}</h3>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {s.prescreenDeadline && preDays !== null && (
                    <DeadlinePill date={s.prescreenDeadline} daysUntil={preDays} />
                  )}
                  {s.applicationDeadline && appDays !== null && (
                    <DeadlinePill date={s.applicationDeadline} daysUntil={appDays} />
                  )}
                  {!s.applicationDeadline && !s.prescreenDeadline && (
                    <span className="text-xs text-zinc-400">No deadlines entered</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
