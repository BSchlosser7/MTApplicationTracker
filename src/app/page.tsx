"use client";

import Link from "next/link";
import useSWR from "swr";
import type { CustomField, CustomFieldValue, School } from "@/lib/types";
import { STATUS_OPTIONS } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { extractDeadlines, overdueDeadlines } from "@/lib/deadlines";
import StatusBadge from "@/components/StatusBadge";
import DeadlinePill from "@/components/DeadlinePill";

export default function DashboardPage() {
  const { data: schools, isLoading } = useSWR<School[]>(
    "/api/schools",
    fetcher
  );
  const { data: fields } = useSWR<CustomField[]>("/api/fields", fetcher);
  const { data: values } = useSWR<CustomFieldValue[]>(
    "/api/field-values",
    fetcher
  );

  if (isLoading || !schools || !fields || !values) {
    return <div className="text-sm text-zinc-500">Loading…</div>;
  }

  const deadlines = extractDeadlines(schools, fields, values).filter(
    (d) => d.daysUntil >= 0
  );
  const overdue = overdueDeadlines(schools, fields, values);
  const nextDeadlines = deadlines.slice(0, 6);

  const activeCount = schools.filter((s) =>
    ["Researching", "In Progress", "Prescreen Submitted", "Application Submitted"].includes(
      s.status
    )
  ).length;
  const acceptedCount = schools.filter((s) => s.status === "Accepted").length;
  const notStartedCount = schools.filter((s) => s.status === "Not Started").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {schools.length} school{schools.length === 1 ? "" : "s"} tracked
        </p>
      </div>

      {overdue.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/50 p-4">
          <div className="font-medium text-red-700 dark:text-red-300 text-sm mb-2">
            {overdue.length} overdue deadline{overdue.length === 1 ? "" : "s"} on
            schools that aren&apos;t marked submitted
          </div>
          <div className="space-y-1">
            {overdue.map((d) => (
              <Link
                key={`${d.schoolId}-${d.type}`}
                href={`/schools/${d.schoolId}`}
                className="block text-sm text-red-700 dark:text-red-300 hover:underline"
              >
                {d.schoolName} — {d.type} was due {d.date.slice(0, 10)}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Schools" value={schools.length} />
        <StatCard label="Active" value={activeCount} />
        <StatCard label="Accepted" value={acceptedCount} />
        <StatCard label="Not Started" value={notStartedCount} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-sm">Upcoming Deadlines</h2>
            <Link href="/calendar" className="text-xs text-zinc-500 hover:underline">
              View calendar →
            </Link>
          </div>
          {nextDeadlines.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming deadlines entered yet.</p>
          ) : (
            <ul className="space-y-2">
              {nextDeadlines.map((d) => (
                <li key={`${d.schoolId}-${d.type}`}>
                  <Link
                    href={`/schools/${d.schoolId}`}
                    className="flex items-center justify-between gap-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 -mx-2 px-2 py-1.5 rounded-md"
                  >
                    <span>
                      <span className="font-medium">{d.schoolName}</span>
                      <span className="text-zinc-500"> — {d.type}</span>
                    </span>
                    <DeadlinePill
                      date={d.date}
                      daysUntil={d.daysUntil}
                      variant={d.kind === "window-start" ? "opens" : "due"}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="font-medium text-sm mb-3">By Status</h2>
          <ul className="space-y-1.5">
            {STATUS_OPTIONS.map((status) => {
              const count = schools.filter((s) => s.status === status).length;
              if (count === 0) return null;
              return (
                <li key={status} className="flex items-center justify-between text-sm">
                  <StatusBadge status={status} />
                  <span className="text-zinc-500">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium text-sm">All Schools</h2>
          <Link href="/schools" className="text-xs text-zinc-500 hover:underline">
            View all →
          </Link>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
          {schools.map((s) => (
            <Link
              key={s.id}
              href={`/schools/${s.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <span className="font-medium truncate">{s.name}</span>
              <StatusBadge status={s.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
    </div>
  );
}
