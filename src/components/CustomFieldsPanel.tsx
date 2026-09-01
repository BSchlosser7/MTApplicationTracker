"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import type { CustomField, CustomFieldValue } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import AddFieldForm from "@/components/AddFieldForm";
import { parseDateRangeValue, serializeDateRangeValue } from "@/lib/dateRange";

export default function CustomFieldsPanel({ schoolId }: { schoolId: string }) {
  const fieldsKey = "/api/fields";
  const valuesKey = `/api/field-values?schoolId=${schoolId}`;
  const { data: fields } = useSWR<CustomField[]>(fieldsKey, fetcher);
  const { data: values } = useSWR<CustomFieldValue[]>(valuesKey, fetcher);

  const [adding, setAdding] = useState(false);

  if (!fields || !values) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  const valueMap = new Map(values.map((v) => [v.fieldId, v.value ?? ""]));

  async function handleDelete(fieldId: string, label: string) {
    if (!confirm(`Delete the "${label}" field? This removes its value on every school.`)) {
      return;
    }
    await fetch(`/api/fields/${fieldId}`, { method: "DELETE" });
    mutate(fieldsKey);
    mutate(valuesKey);
    mutate("/api/field-values");
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 && !adding && (
        <p className="text-sm text-zinc-500">
          No custom fields yet. Add one to start tracking anything not already on this
          page.
        </p>
      )}

      {fields.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={valueMap.get(field.id) ?? ""}
              schoolId={schoolId}
              valuesKey={valuesKey}
              onDelete={() => handleDelete(field.id, field.label)}
            />
          ))}
        </div>
      )}

      {adding ? (
        <AddFieldForm
          onDone={() => setAdding(false)}
          onCreated={() => mutate(fieldsKey)}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:underline"
        >
          + Add Field
        </button>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  schoolId,
  valuesKey,
  onDelete,
}: {
  field: CustomField;
  value: string;
  schoolId: string;
  valuesKey: string;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [labelDraft, setLabelDraft] = useState(field.label);

  async function commit(next?: string) {
    const nextValue = next ?? draft;
    if (nextValue === value) return;
    await fetch("/api/field-values", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId, fieldId: field.id, value: nextValue }),
    });
    mutate(valuesKey);
    mutate("/api/field-values");
  }

  async function commitLabel() {
    const trimmed = labelDraft.trim();
    if (!trimmed) {
      setLabelDraft(field.label);
      return;
    }
    if (trimmed === field.label) return;
    await fetch(`/api/fields/${field.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: trimmed }),
    });
    mutate("/api/fields");
  }

  async function commitRange(patch: { start?: string; end?: string }) {
    const range = parseDateRangeValue(value);
    const next = serializeDateRangeValue({ ...range, ...patch }) ?? "";
    setDraft(next);
    await commit(next);
  }

  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 mb-1">
        <input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setLabelDraft(field.label);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="text-xs font-medium text-zinc-500 bg-transparent flex-1 min-w-0 rounded px-1 -mx-1 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 focus:text-zinc-900 dark:focus:text-white"
        />
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-zinc-300 hover:text-red-600 dark:text-zinc-700 dark:hover:text-red-400"
          title="Delete field"
        >
          ×
        </button>
      </span>
      {field.type === "daterange" ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={parseDateRangeValue(value).start ?? ""}
            onChange={(e) => commitRange({ start: e.target.value })}
            className="flex-1 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
          />
          <span className="text-xs text-zinc-400">to</span>
          <input
            type="date"
            value={parseDateRangeValue(value).end ?? ""}
            onChange={(e) => commitRange({ end: e.target.value })}
            className="flex-1 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
          />
        </div>
      ) : field.type === "longtext" ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit()}
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm resize-y"
        />
      ) : (
        <input
          type={field.type === "date" ? "date" : field.type === "url" ? "url" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit()}
          className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
        />
      )}
    </label>
  );
}
