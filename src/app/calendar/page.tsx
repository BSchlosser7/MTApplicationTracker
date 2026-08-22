"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { CustomField, CustomFieldValue, School } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { extractDeadlines, type DeadlineEntry } from "@/lib/deadlines";
import DeadlinePill from "@/components/DeadlinePill";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { data: schools } = useSWR<School[]>("/api/schools", fetcher);
  const { data: fields } = useSWR<CustomField[]>("/api/fields", fetcher);
  const { data: values } = useSWR<CustomFieldValue[]>(
    "/api/field-values",
    fetcher
  );
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<"month" | "list">("month");

  const deadlines = useMemo(
    () => (schools && fields && values ? extractDeadlines(schools, fields, values) : []),
    [schools, fields, values]
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  function deadlinesOn(day: Date): DeadlineEntry[] {
    return deadlines.filter((d) => isSameDay(parseISO(d.date), day));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden text-sm">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 ${view === "month" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""}`}
            >
              Month
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 ${view === "list" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {view === "month" ? (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMonth((m) => subMonths(m, 1))}
              className="px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-sm"
            >
              ← Prev
            </button>
            <div className="font-medium text-sm flex items-center gap-2">
              {format(month, "MMMM yyyy")}
              <button
                onClick={() => setMonth(startOfMonth(new Date()))}
                className="text-xs text-zinc-500 hover:underline"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900 text-sm"
            >
              Next →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="bg-zinc-100 dark:bg-zinc-900 px-2 py-1.5 text-xs font-medium text-zinc-500 text-center"
              >
                {w}
              </div>
            ))}
            {days.map((day) => {
              const inMonth = isSameMonth(day, month);
              const dayDeadlines = deadlinesOn(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-24 sm:min-h-28 bg-white dark:bg-zinc-950 p-1.5 flex flex-col gap-1 ${
                    inMonth ? "" : "opacity-40"
                  }`}
                >
                  <span
                    className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday(day)
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                        : "text-zinc-500"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {dayDeadlines.map((d) => (
                      <Link
                        key={`${d.schoolId}-${d.type}`}
                        href={`/schools/${d.schoolId}`}
                        title={`${d.schoolName} — ${d.type}`}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                          d.kind === "window-start"
                            ? "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                            : d.kind === "window-end"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        }`}
                      >
                        {d.schoolName}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
          {deadlines.length === 0 ? (
            <p className="text-sm text-zinc-500 p-4">No deadlines entered yet.</p>
          ) : (
            deadlines.map((d) => (
              <Link
                key={`${d.schoolId}-${d.type}`}
                href={`/schools/${d.schoolId}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
