"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import useSWR, { mutate } from "swr";
import type { School, CustomField, CustomFieldValue, FieldGroup } from "@/lib/types";
import { STATUS_OPTIONS } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import AddFieldForm from "@/components/AddFieldForm";
import { parseDateRangeValue, serializeDateRangeValue } from "@/lib/dateRange";

type ColumnType = "status" | "date" | "daterange" | "link" | "text" | "longtext";

interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  fieldId?: string;
  groupId?: string | null;
}

const STATUS_COLUMN: ColumnDef = {
  key: "status",
  label: "Status",
  type: "status",
};

const CUSTOM_TYPE_TO_COLUMN_TYPE: Record<string, ColumnType> = {
  text: "text",
  longtext: "longtext",
  date: "date",
  daterange: "daterange",
  url: "link",
};

const DEFAULT_WIDTH: Record<ColumnType, number> = {
  status: 176,
  date: 160,
  daterange: 230,
  link: 192,
  text: 160,
  longtext: 288,
};

const UNGROUPED = "__ungrouped__";
const MIN_WIDTH = 90;
const HIDDEN_STORAGE_KEY = "mt-tracker-table-hidden-columns";
const WIDTH_STORAGE_KEY = "mt-tracker-table-column-widths";

export default function TablePage() {
  const { data: schools, isLoading } = useSWR<School[]>("/api/schools", fetcher);
  const { data: fields } = useSWR<CustomField[]>("/api/fields", fetcher);
  const { data: groups } = useSWR<FieldGroup[]>("/api/field-groups", fetcher);
  const { data: fieldValues } = useSWR<CustomFieldValue[]>(
    "/api/field-values",
    fetcher
  );

  // Start with the same "everything visible" default on server and client so
  // hydration matches, then sync the persisted preference in after mount.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from localStorage on mount, after hydration
      if (stored) setHidden(new Set(JSON.parse(stored)));
    } catch {
      // ignore malformed storage
    }
    try {
      const storedWidths = localStorage.getItem(WIDTH_STORAGE_KEY);
      if (storedWidths) setColWidths(JSON.parse(storedWidths));
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
    function onOutsideClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setAddingField(false);
      }
    }
  }, []);

  const customColumns: ColumnDef[] = useMemo(
    () =>
      (fields ?? []).map((f) => ({
        key: f.id,
        label: f.label,
        type: CUSTOM_TYPE_TO_COLUMN_TYPE[f.type] ?? "text",
        fieldId: f.id,
        groupId: f.groupId,
      })),
    [fields]
  );

  const columnsByGroup = useMemo(() => {
    const m = new Map<string, ColumnDef[]>();
    for (const c of customColumns) {
      const key = c.groupId ?? UNGROUPED;
      const arr = m.get(key) ?? [];
      arr.push(c);
      m.set(key, arr);
    }
    return m;
  }, [customColumns]);

  const allColumns = useMemo(
    () => [STATUS_COLUMN, ...customColumns],
    [customColumns]
  );

  const valueMap = useMemo(() => {
    const m = new Map<string, string>();
    (fieldValues ?? []).forEach((v) => {
      m.set(`${v.schoolId}:${v.fieldId}`, v.value ?? "");
    });
    return m;
  }, [fieldValues]);

  function getValue(school: School, col: ColumnDef): string {
    if (col.fieldId) return valueMap.get(`${school.id}:${col.fieldId}`) ?? "";
    return (school[col.key as keyof School] as string) ?? "";
  }

  function sortValue(school: School, col: ColumnDef): string {
    const raw = getValue(school, col);
    if (col.type === "daterange") {
      const { start, end } = parseDateRangeValue(raw);
      return start ?? end ?? "";
    }
    return raw;
  }

  function widthFor(key: string, type: ColumnType): number {
    return colWidths[key] ?? DEFAULT_WIDTH[type];
  }

  function startResize(e: React.MouseEvent, col: ColumnDef) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widthFor(col.key, col.type);

    function onMove(ev: MouseEvent) {
      const next = Math.max(MIN_WIDTH, startWidth + (ev.clientX - startX));
      setColWidths((w) => ({ ...w, [col.key]: next }));
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setColWidths((w) => {
        localStorage.setItem(WIDTH_STORAGE_KEY, JSON.stringify(w));
        return w;
      });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function persistHidden(next: Set<string>) {
    setHidden(next);
    localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify([...next]));
  }

  function toggleColumn(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persistHidden(next);
  }

  function setAll(show: boolean) {
    persistHidden(show ? new Set() : new Set(allColumns.map((c) => c.key)));
  }

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.dir === "asc" ? { key, dir: "desc" } : null;
      }
      return { key, dir: "asc" };
    });
  }

  async function handleDeleteField(fieldId: string, label: string) {
    if (!confirm(`Delete the "${label}" field? This removes its value on every school.`)) {
      return;
    }
    await fetch(`/api/fields/${fieldId}`, { method: "DELETE" });
    mutate("/api/fields");
    mutate("/api/field-values");
  }

  const sorted = useMemo(() => {
    if (!schools) return [];
    if (!sort) return schools;
    const col = allColumns.find((c) => c.key === sort.key);
    if (!col) return schools;
    const copy = [...schools];
    copy.sort((a, b) => {
      const av = sortValue(a, col);
      const bv = sortValue(b, col);
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      const cmp = av.localeCompare(bv);
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools, sort, allColumns, valueMap]);

  const activeColumns = allColumns.filter((c) => !hidden.has(c.key));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Table</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Pick fields to compare across every school. Click a column header to
            sort, drag its right edge to resize.
          </p>
        </div>
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((o) => !o)}
            className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Columns ({activeColumns.length}/{allColumns.length})
          </button>
          {pickerOpen && (
            <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg py-2 z-30">
              <div className="flex items-center justify-between px-3 pb-2 mb-1 border-b border-zinc-100 dark:border-zinc-900">
                <button
                  onClick={() => setAll(true)}
                  className="text-xs text-zinc-500 hover:underline"
                >
                  Show all
                </button>
                <button
                  onClick={() => setAll(false)}
                  className="text-xs text-zinc-500 hover:underline"
                >
                  Hide all
                </button>
              </div>
              <label
                className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={!hidden.has(STATUS_COLUMN.key)}
                  onChange={() => toggleColumn(STATUS_COLUMN.key)}
                />
                {STATUS_COLUMN.label}
              </label>
              {(groups ?? []).map((g) => {
                const cols = columnsByGroup.get(g.id) ?? [];
                if (cols.length === 0) return null;
                return (
                  <div key={g.id}>
                    <div className="px-3 pt-2 pb-1 text-xs font-semibold text-zinc-400">
                      {g.name}
                    </div>
                    {cols.map((c) => (
                      <ColumnPickerRow
                        key={c.key}
                        column={c}
                        checked={!hidden.has(c.key)}
                        onToggle={() => toggleColumn(c.key)}
                        onDelete={() => handleDeleteField(c.fieldId!, c.label)}
                      />
                    ))}
                  </div>
                );
              })}
              {(columnsByGroup.get(UNGROUPED) ?? []).length > 0 && (
                <div>
                  {(groups ?? []).length > 0 && (
                    <div className="px-3 pt-2 pb-1 text-xs font-semibold text-zinc-400">
                      Ungrouped
                    </div>
                  )}
                  {(columnsByGroup.get(UNGROUPED) ?? []).map((c) => (
                    <ColumnPickerRow
                      key={c.key}
                      column={c}
                      checked={!hidden.has(c.key)}
                      onToggle={() => toggleColumn(c.key)}
                      onDelete={() => handleDeleteField(c.fieldId!, c.label)}
                    />
                  ))}
                </div>
              )}

              <div className="px-3 pt-2 mt-1 border-t border-zinc-100 dark:border-zinc-900">
                {addingField ? (
                  <AddFieldForm
                    onDone={() => setAddingField(false)}
                    onCreated={() => mutate("/api/fields")}
                  />
                ) : (
                  <button
                    onClick={() => setAddingField(true)}
                    className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:underline"
                  >
                    + Add Field
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading || !schools ? (
        <div className="text-sm text-zinc-500">Loading…</div>
      ) : (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-auto max-h-[75vh]">
          <table className="border-collapse text-sm table-fixed">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-zinc-50 dark:bg-zinc-900 border-b border-r border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left font-medium w-56">
                  School
                </th>
                {activeColumns.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    style={{ width: widthFor(c.key, c.type) }}
                    className="relative sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left font-medium cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span className="flex items-center gap-1 truncate">
                      {c.label}
                      {sort?.key === c.key && (
                        <span className="text-zinc-400">
                          {sort.dir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </span>
                    <div
                      onMouseDown={(e) => startResize(e, c)}
                      onClick={(e) => e.stopPropagation()}
                      title="Drag to resize"
                      className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-zinc-300 dark:hover:bg-zinc-700"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((school) => (
                <tr
                  key={school.id}
                  className="border-b border-zinc-100 dark:border-zinc-900 last:border-b-0"
                >
                  <td className="sticky left-0 z-10 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 px-3 py-2 align-top w-56">
                    <Link
                      href={`/schools/${school.id}`}
                      className="font-medium hover:underline"
                    >
                      {school.name}
                    </Link>
                  </td>
                  {activeColumns.map((c) => (
                    <Cell
                      key={c.key}
                      school={school}
                      column={c}
                      value={getValue(school, c)}
                      width={widthFor(c.key, c.type)}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ColumnPickerRow({
  column,
  checked,
  onToggle,
  onDelete,
}: {
  column: ColumnDef;
  checked: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="truncate">{column.label}</span>
      </label>
      <button
        onClick={onDelete}
        className="text-zinc-300 hover:text-red-600 dark:text-zinc-700 dark:hover:text-red-400 shrink-0"
        title="Delete field"
      >
        ×
      </button>
    </div>
  );
}

function Cell({
  school,
  column,
  value,
  width,
}: {
  school: School;
  column: ColumnDef;
  value: string;
  width: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const style = { width };

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  async function commit(newValue: string) {
    setEditing(false);
    if (newValue === value) return;

    if (column.fieldId) {
      await fetch("/api/field-values", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: school.id,
          fieldId: column.fieldId,
          value: newValue,
        }),
      });
      mutate("/api/field-values");
      return;
    }

    await fetch(`/api/schools/${school.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [column.key]: newValue || null }),
    });
    mutate("/api/schools");
    mutate(`/api/schools/${school.id}`);
    mutate(`/api/schools/${school.id}/activity`);
  }

  if (column.type === "status") {
    return (
      <td className="px-2 py-1.5 align-top" style={style}>
        <select
          value={school.status}
          onChange={(e) => commit(e.target.value)}
          className="bg-transparent text-sm w-full focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded px-1 py-0.5"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
    );
  }

  if (column.type === "date") {
    return (
      <td className="px-2 py-1.5 align-top" style={style}>
        <input
          type="date"
          value={value ? value.slice(0, 10) : ""}
          onChange={(e) => commit(e.target.value)}
          className="bg-transparent text-sm w-full focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded px-1 py-0.5"
        />
      </td>
    );
  }

  if (column.type === "daterange") {
    const range = parseDateRangeValue(value);
    return (
      <td className="px-2 py-1.5 align-top" style={style}>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={range.start ?? ""}
            onChange={(e) =>
              commit(serializeDateRangeValue({ ...range, start: e.target.value }) ?? "")
            }
            className="bg-transparent text-xs w-full min-w-0 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded px-1 py-0.5"
          />
          <span className="text-zinc-400 text-xs shrink-0">–</span>
          <input
            type="date"
            value={range.end ?? ""}
            onChange={(e) =>
              commit(serializeDateRangeValue({ ...range, end: e.target.value }) ?? "")
            }
            className="bg-transparent text-xs w-full min-w-0 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 rounded px-1 py-0.5"
          />
        </div>
      </td>
    );
  }

  if (editing) {
    if (column.type === "longtext") {
      return (
        <td className="p-0 align-top" style={style}>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
            rows={4}
            className="w-full h-full min-h-20 px-3 py-2 text-sm bg-white dark:bg-zinc-950 border-2 border-zinc-900 dark:border-white rounded resize-none focus:outline-none"
          />
        </td>
      );
    }
    return (
      <td className="p-0 align-top" style={style}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-950 border-2 border-zinc-900 dark:border-white rounded focus:outline-none"
        />
      </td>
    );
  }

  if (column.type === "link") {
    return (
      <td
        onClick={startEdit}
        className="px-3 py-2 align-top cursor-text"
        style={style}
      >
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <span className="text-zinc-300 dark:text-zinc-700">—</span>
        )}
      </td>
    );
  }

  return (
    <td
      onClick={startEdit}
      className="px-3 py-2 align-top cursor-text whitespace-pre-wrap break-words"
      style={style}
    >
      {value ? value : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
    </td>
  );
}
