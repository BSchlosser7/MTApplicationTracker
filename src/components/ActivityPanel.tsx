"use client";

import { useState } from "react";
import { mutate } from "swr";
import type { ActivityRow } from "@/lib/types";
import { formatDistanceToNow, parseISO } from "date-fns";

export default function ActivityPanel({
  schoolId,
  activity,
}: {
  schoolId: string;
  activity: ActivityRow[];
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const key = `/api/schools/${schoolId}/activity`;

  async function handleAddNote() {
    if (!note.trim()) return;
    setSubmitting(true);
    const res = await fetch(key, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note.trim() }),
    });
    setSubmitting(false);
    if (res.ok) {
      setNote("");
      mutate(key);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col sm:flex-row gap-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (e.g. call with admissions, requirement change)…"
          rows={2}
          className="flex-1 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-y"
        />
        <button
          onClick={handleAddNote}
          disabled={!note.trim() || submitting}
          className="px-3 py-2 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-40 shrink-0 h-fit"
        >
          Add Note
        </button>
      </div>

      {activity.length === 0 ? (
        <p className="text-sm text-zinc-500">No activity yet.</p>
      ) : (
        <ol className="space-y-3">
          {activity.map((a) => (
            <li key={a.id} className="flex gap-3 text-sm">
              <span className="text-zinc-400 mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 mt-2" />
              <div>
                {a.type === "status_change" ? (
                  <p>
                    Status changed{" "}
                    {a.fromStatus ? (
                      <>
                        from <span className="font-medium">{a.fromStatus}</span>{" "}
                      </>
                    ) : (
                      ""
                    )}
                    to <span className="font-medium">{a.toStatus}</span>
                  </p>
                ) : (
                  <p className="whitespace-pre-wrap">{a.note}</p>
                )}
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatDistanceToNow(parseISO(a.createdAt), { addSuffix: true })}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
