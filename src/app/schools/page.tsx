"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { CustomField, CustomFieldValue, School, Status } from "@/lib/types";
import { STATUS_OPTIONS } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import StatusBadge from "@/components/StatusBadge";
import DeadlinePill from "@/components/DeadlinePill";
import { extractDeadlines } from "@/lib/deadlines";

export default function SchoolsPage() {
  const { data: schools, isLoading } = useSWR<School[]>(
    "/api/schools",
    fetcher
  );
  const { data: fields } = useSWR<CustomField[]>("/api/fields", fetcher);
  const { data: values } = useSWR<CustomFieldValue[]>(
    "/api/field-values",
    fetcher
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");

  const deadlinesBySchool = useMemo(() => {
    const m = new Map<string, ReturnType<typeof extractDeadlines>>();
    if (!schools || !fields || !values) return m;
    for (const d of extractDeadlines(schools, fields, values)) {
      const arr = m.get(d.schoolId) ?? [];
      arr.push(d);
      m.set(d.schoolId, arr);
    }
    return m;
  }, [schools, fields, values]);

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
            const deadlines = deadlinesBySchool.get(s.id) ?? [];
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
                  {deadlines.map((d) => (
                    <span key={d.type} className="inline-flex items-center gap-1">
                      <span className="text-[10px] text-zinc-400">{d.type}</span>
                      <DeadlinePill
                        date={d.date}
                        daysUntil={d.daysUntil}
                        variant={d.kind === "window-start" ? "opens" : "due"}
                      />
                    </span>
                  ))}
                  {deadlines.length === 0 && (
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
