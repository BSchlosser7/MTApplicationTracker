"use client";

import { useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import type { School, DocumentRow, ActivityRow } from "@/lib/types";
import { STATUS_OPTIONS, REQUIREMENT_FIELDS } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import StatusBadge from "@/components/StatusBadge";
import DocumentsPanel from "@/components/DocumentsPanel";
import ActivityPanel from "@/components/ActivityPanel";
import CustomFieldsPanel from "@/components/CustomFieldsPanel";

export default function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = usePromise(params);
  const router = useRouter();
  const { data: school } = useSWR<School>(`/api/schools/${id}`, fetcher);

  const [prevId, setPrevId] = useState(id);
  const [edits, setEdits] = useState<Partial<School>>({});
  const [saving, setSaving] = useState(false);

  if (id !== prevId) {
    setPrevId(id);
    setEdits({});
  }

  if (!school) {
    return <div className="text-sm text-zinc-500">Loading…</div>;
  }

  const form: School = { ...school, ...edits };
  const dirty = Object.keys(edits).length > 0;
  const schoolName = form.name;

  function set<K extends keyof School>(key: K, value: School[K]) {
    setEdits((e) => ({ ...e, [key]: value }));
  }

  async function save() {
    if (!dirty) return;
    setSaving(true);
    const res = await fetch(`/api/schools/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(edits),
    });
    setSaving(false);
    if (res.ok) {
      setEdits({});
      mutate(`/api/schools/${id}`);
      mutate("/api/schools");
      mutate(`/api/schools/${id}/activity`);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${schoolName}? This removes all documents and notes too.`)) {
      return;
    }
    await fetch(`/api/schools/${id}`, { method: "DELETE" });
    mutate("/api/schools");
    router.push("/schools");
  }

  function dateInputValue(iso: string | null) {
    return iso ? iso.slice(0, 10) : "";
  }

  function fromDateInput(value: string): string | null {
    return value || null;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="text-xl font-semibold bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded px-1 -mx-1"
          />
          <input
            value={form.website ?? ""}
            onChange={(e) => set("website", e.target.value)}
            placeholder="Website URL"
            className="text-sm text-zinc-500 bg-transparent w-full mt-1 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded px-1 -mx-1"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={form.status} />
          <button
            onClick={handleDelete}
            className="text-xs text-red-600 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="sticky top-14 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-3 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <section className="grid sm:grid-cols-3 gap-4">
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as School["status"])}
            className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prescreen Deadline">
          <input
            type="date"
            value={dateInputValue(form.prescreenDeadline)}
            onChange={(e) => set("prescreenDeadline", fromDateInput(e.target.value))}
            className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
          />
        </Field>
        <Field label="Application Deadline">
          <input
            type="date"
            value={dateInputValue(form.applicationDeadline)}
            onChange={(e) => set("applicationDeadline", fromDateInput(e.target.value))}
            className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
          />
        </Field>
      </section>

      <section>
        <h2 className="font-medium text-sm mb-3">Audition & Application Requirements</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {REQUIREMENT_FIELDS.map(({ key, label }) => (
            <Field key={key} label={label}>
              <textarea
                value={(form[key] as string) ?? ""}
                onChange={(e) => set(key, e.target.value as School[typeof key])}
                rows={label.includes("Notes") || label.includes("Prompts") ? 4 : 2}
                className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-y"
              />
            </Field>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium text-sm mb-3">Custom Fields</h2>
        <CustomFieldsPanel schoolId={id} />
      </section>

      <DocumentsSection schoolId={id} />
      <ActivitySection schoolId={id} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-zinc-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function DocumentsSection({ schoolId }: { schoolId: string }) {
  const { data: documents } = useSWR<DocumentRow[]>(
    `/api/schools/${schoolId}/documents`,
    fetcher
  );
  return (
    <section>
      <h2 className="font-medium text-sm mb-3">Documents</h2>
      <DocumentsPanel schoolId={schoolId} documents={documents ?? []} />
    </section>
  );
}

function ActivitySection({ schoolId }: { schoolId: string }) {
  const { data: activity } = useSWR<ActivityRow[]>(
    `/api/schools/${schoolId}/activity`,
    fetcher
  );
  return (
    <section>
      <h2 className="font-medium text-sm mb-3">Activity & Notes</h2>
      <ActivityPanel schoolId={schoolId} activity={activity ?? []} />
    </section>
  );
}
