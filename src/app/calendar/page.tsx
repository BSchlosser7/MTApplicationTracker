"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
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
import type { CalendarEvent, CustomField, CustomFieldValue, School } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import { extractDeadlines, type DeadlineEntry } from "@/lib/deadlines";
import DeadlinePill from "@/components/DeadlinePill";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const eventsKey = "/api/calendar-events";

export default function CalendarPage() {
  const { data: schools } = useSWR<School[]>("/api/schools", fetcher);
  const { data: fields } = useSWR<CustomField[]>("/api/fields", fetcher);
  const { data: values } = useSWR<CustomFieldValue[]>(
    "/api/field-values",
    fetcher
  );
  const { data: events } = useSWR<CalendarEvent[]>(eventsKey, fetcher);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [view, setView] = useState<"month" | "list">("month");
  const [adding, setAdding] = useState(false);

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

  function eventsOn(day: Date): CalendarEvent[] {
    return (events ?? []).filter((e) => isSameDay(parseISO(e.date), day));
  }

  async function handleDeleteEvent(id: string) {
    await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
    mutate(eventsKey);
  }

  type ListItem =
    | { kind: "deadline"; date: string; data: DeadlineEntry }
    | { kind: "event"; date: string; data: CalendarEvent };

  const listItems: ListItem[] = useMemo(() => {
    const items: ListItem[] = [
      ...deadlines.map((d) => ({ kind: "deadline" as const, date: d.date, data: d })),
      ...(events ?? []).map((e) => ({ kind: "event" as const, date: e.date, data: e })),
    ];
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [deadlines, events]);

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
          <button
            onClick={() => setAdding((a) => !a)}
            className="px-3 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90"
          >
            + Add Event
          </button>
        </div>
      </div>

      {adding && (
        <AddEventForm schools={schools ?? []} onDone={() => setAdding(false)} />
      )}

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
              const dayEvents = eventsOn(day);
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
                    {dayEvents.map((e) =>
                      e.schoolId ? (
                        <Link
                          key={e.id}
                          href={`/schools/${e.schoolId}`}
                          title={e.note ? `${e.title} — ${e.note}` : e.title}
                          className="text-[10px] leading-tight px-1 py-0.5 rounded truncate bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        >
                          {e.title}
                        </Link>
                      ) : (
                        <span
                          key={e.id}
                          title={e.note ? `${e.title} — ${e.note}` : e.title}
                          className="text-[10px] leading-tight px-1 py-0.5 rounded truncate bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        >
                          {e.title}
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
          {listItems.length === 0 ? (
            <p className="text-sm text-zinc-500 p-4">No deadlines or events yet.</p>
          ) : (
            listItems.map((item) =>
              item.kind === "deadline" ? (
                <Link
                  key={`${item.data.schoolId}-${item.data.type}`}
                  href={`/schools/${item.data.schoolId}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span className="font-medium">{item.data.schoolName}</span>
                    <span className="text-zinc-500"> — {item.data.type}</span>
                  </span>
                  <DeadlinePill
                    date={item.data.date}
                    daysUntil={item.data.daysUntil}
                    variant={item.data.kind === "window-start" ? "opens" : "due"}
                  />
                </Link>
              ) : (
                <div
                  key={item.data.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  {item.data.schoolId ? (
                    <Link href={`/schools/${item.data.schoolId}`} className="hover:underline">
                      <span className="font-medium">{item.data.title}</span>
                      {item.data.note && (
                        <span className="text-zinc-500"> — {item.data.note}</span>
                      )}
                    </Link>
                  ) : (
                    <span>
                      <span className="font-medium">{item.data.title}</span>
                      {item.data.note && (
                        <span className="text-zinc-500"> — {item.data.note}</span>
                      )}
                    </span>
                  )}
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {format(parseISO(item.data.date), "MMM d")}
                    </span>
                    <button
                      onClick={() => handleDeleteEvent(item.data.id)}
                      className="text-zinc-300 hover:text-red-600 dark:text-zinc-700 dark:hover:text-red-400"
                      title="Delete event"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

function AddEventForm({
  schools,
  onDone,
}: {
  schools: School[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSubmitting(true);
    await fetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        date,
        note: note.trim() || undefined,
        schoolId: schoolId || undefined,
      }),
    });
    setSubmitting(false);
    mutate(eventsKey);
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col sm:flex-row gap-2 flex-wrap"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event title (e.g. Audition travel day)"
        className="flex-1 min-w-40 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
      />
      <select
        value={schoolId}
        onChange={(e) => setSchoolId(e.target.value)}
        className="px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
      >
        <option value="">No school</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="flex-1 min-w-40 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!title.trim() || !date || submitting}
          className="px-3 py-2 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-2 rounded-md text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
