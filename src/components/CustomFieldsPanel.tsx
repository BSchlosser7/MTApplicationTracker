"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CustomField, CustomFieldValue, FieldGroup } from "@/lib/types";
import { fetcher } from "@/lib/fetcher";
import AddFieldForm from "@/components/AddFieldForm";
import { parseDateRangeValue, serializeDateRangeValue } from "@/lib/dateRange";

const UNGROUPED = "__ungrouped__";

export default function CustomFieldsPanel({ schoolId }: { schoolId: string }) {
  const fieldsKey = "/api/fields";
  const groupsKey = "/api/field-groups";
  const valuesKey = `/api/field-values?schoolId=${schoolId}`;
  const { data: fields } = useSWR<CustomField[]>(fieldsKey, fetcher);
  const { data: groups } = useSWR<FieldGroup[]>(groupsKey, fetcher);
  const { data: values } = useSWR<CustomFieldValue[]>(valuesKey, fetcher);

  const [adding, setAdding] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const groupSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!fields || !values || !groups) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  const valueMap = new Map(values.map((v) => [v.fieldId, v.value ?? ""]));

  const fieldsByGroup = new Map<string, CustomField[]>();
  for (const f of fields) {
    const key = f.groupId ?? UNGROUPED;
    const arr = fieldsByGroup.get(key) ?? [];
    arr.push(f);
    fieldsByGroup.set(key, arr);
  }

  async function handleDeleteField(fieldId: string, label: string) {
    if (!confirm(`Delete the "${label}" field? This removes its value on every school.`)) {
      return;
    }
    await fetch(`/api/fields/${fieldId}`, { method: "DELETE" });
    mutate(fieldsKey);
    mutate(valuesKey);
    mutate("/api/field-values");
  }

  async function moveField(field: CustomField, targetGroupId: string | null) {
    if (!fields || field.groupId === targetGroupId) return;
    const targetKey = targetGroupId ?? UNGROUPED;
    const existing = (fieldsByGroup.get(targetKey) ?? []).filter((f) => f.id !== field.id);
    const orderedIds = [...existing.map((f) => f.id), field.id];

    const optimistic = fields.map((f) =>
      f.id === field.id ? { ...f, groupId: targetGroupId } : f
    );
    mutate(fieldsKey, optimistic, false);

    await fetch("/api/fields/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds, groupId: targetGroupId }),
    });
    mutate(fieldsKey);
  }

  async function handleFieldDragEnd(groupKey: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!fields || !over || active.id === over.id) return;
    const groupFields = fieldsByGroup.get(groupKey) ?? [];
    const oldIndex = groupFields.findIndex((f) => f.id === active.id);
    const newIndex = groupFields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedGroup = arrayMove(groupFields, oldIndex, newIndex);
    const optimisticFields = fields.map((f) => {
      const idx = reorderedGroup.findIndex((g) => g.id === f.id);
      return idx === -1 ? f : reorderedGroup[idx];
    });
    mutate(fieldsKey, optimisticFields, false);

    await fetch("/api/fields/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderedIds: reorderedGroup.map((f) => f.id),
        groupId: groupKey === UNGROUPED ? null : groupKey,
      }),
    });
    mutate(fieldsKey);
  }

  async function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!groups || !over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(groups, oldIndex, newIndex);
    mutate(groupsKey, reordered, false);
    await fetch("/api/field-groups/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((g) => g.id) }),
    });
    mutate(groupsKey);
    mutate(fieldsKey); // field order also depends on group sort_order
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;
    await fetch("/api/field-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setNewGroupName("");
    setAddingGroup(false);
    mutate(groupsKey);
  }

  async function handleDeleteGroup(groupId: string, name: string) {
    if (!confirm(`Delete the "${name}" group? Its fields become ungrouped, not deleted.`)) {
      return;
    }
    await fetch(`/api/field-groups/${groupId}`, { method: "DELETE" });
    mutate(groupsKey);
    mutate(fieldsKey);
  }

  const ungroupedFields = fieldsByGroup.get(UNGROUPED) ?? [];

  return (
    <div className="space-y-6">
      {fields.length === 0 && !adding && (
        <p className="text-sm text-zinc-500">
          No custom fields yet. Add one to start tracking anything not already on this
          page.
        </p>
      )}

      {groups.length > 0 && (
        <DndContext
          sensors={groupSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleGroupDragEnd}
        >
          <SortableContext
            items={groups.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {groups.map((group) => (
                <GroupSection
                  key={group.id}
                  group={group}
                  fields={fieldsByGroup.get(group.id) ?? []}
                  allGroups={groups}
                  valueMap={valueMap}
                  schoolId={schoolId}
                  valuesKey={valuesKey}
                  onDeleteField={handleDeleteField}
                  onMoveField={moveField}
                  onDeleteGroup={handleDeleteGroup}
                  onFieldDragEnd={(e) => handleFieldDragEnd(group.id, e)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {(ungroupedFields.length > 0 || groups.length === 0) && (
        <GroupSection
          group={null}
          fields={ungroupedFields}
          allGroups={groups}
          valueMap={valueMap}
          schoolId={schoolId}
          valuesKey={valuesKey}
          onDeleteField={handleDeleteField}
          onMoveField={moveField}
          onFieldDragEnd={(e) => handleFieldDragEnd(UNGROUPED, e)}
        />
      )}

      <div className="flex items-center gap-4 flex-wrap">
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

        {addingGroup ? (
          <form onSubmit={handleAddGroup} className="flex items-center gap-2">
            <input
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
            />
            <button
              type="submit"
              disabled={!newGroupName.trim()}
              className="px-3 py-1.5 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingGroup(false);
                setNewGroupName("");
              }}
              className="text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 px-2 py-1.5 rounded-md"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAddingGroup(true)}
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:underline"
          >
            + Add Group
          </button>
        )}
      </div>
    </div>
  );
}

function GroupSection({
  group,
  fields,
  allGroups,
  valueMap,
  schoolId,
  valuesKey,
  onDeleteField,
  onMoveField,
  onDeleteGroup,
  onFieldDragEnd,
}: {
  group: FieldGroup | null;
  fields: CustomField[];
  allGroups: FieldGroup[];
  valueMap: Map<string, string>;
  schoolId: string;
  valuesKey: string;
  onDeleteField: (fieldId: string, label: string) => void;
  onMoveField: (field: CustomField, targetGroupId: string | null) => void;
  onDeleteGroup?: (groupId: string, name: string) => void;
  onFieldDragEnd: (event: DragEndEvent) => void;
}) {
  const [nameDraft, setNameDraft] = useState(group?.name ?? "");
  const sortable = useSortable({ id: group?.id ?? UNGROUPED, disabled: !group });
  const fieldSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const style = group
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }
    : undefined;

  async function commitName() {
    if (!group) return;
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(group.name);
      return;
    }
    if (trimmed === group.name) return;
    await fetch(`/api/field-groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    mutate("/api/field-groups");
  }

  return (
    <div
      ref={group ? sortable.setNodeRef : undefined}
      style={style}
      className={group && sortable.isDragging ? "relative z-10 opacity-50" : "relative"}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        {group ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button
              type="button"
              {...sortable.attributes}
              {...sortable.listeners}
              className="shrink-0 touch-none cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing dark:text-zinc-700 dark:hover:text-zinc-400"
              title="Drag to reorder group"
            >
              ⠿
            </button>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setNameDraft(group.name);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="min-w-0 flex-1 rounded bg-transparent px-1 -mx-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700"
            />
          </div>
        ) : (
          <h3 className="text-sm font-semibold text-zinc-400">Ungrouped</h3>
        )}
        {group && onDeleteGroup && (
          <button
            type="button"
            onClick={() => onDeleteGroup(group.id, group.name)}
            className="text-xs text-zinc-300 hover:text-red-600 dark:text-zinc-700 dark:hover:text-red-400 shrink-0"
            title="Delete group"
          >
            ×
          </button>
        )}
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-zinc-400">No fields here yet.</p>
      ) : (
        <DndContext
          sensors={fieldSensors}
          collisionDetection={closestCenter}
          onDragEnd={onFieldDragEnd}
        >
          <SortableContext items={fields.map((f) => f.id)} strategy={rectSortingStrategy}>
            <div className="grid sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <FieldInput
                  key={field.id}
                  field={field}
                  value={valueMap.get(field.id) ?? ""}
                  schoolId={schoolId}
                  valuesKey={valuesKey}
                  allGroups={allGroups}
                  onDelete={() => onDeleteField(field.id, field.label)}
                  onMoveField={onMoveField}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  schoolId,
  valuesKey,
  allGroups,
  onDelete,
  onMoveField,
}: {
  field: CustomField;
  value: string;
  schoolId: string;
  valuesKey: string;
  allGroups: FieldGroup[];
  onDelete: () => void;
  onMoveField: (field: CustomField, targetGroupId: string | null) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [labelDraft, setLabelDraft] = useState(field.label);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "relative z-10 opacity-50" : "relative"}
    >
      <span className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1 flex-1 min-w-0">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="shrink-0 touch-none cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing dark:text-zinc-700 dark:hover:text-zinc-400"
            title="Drag to reorder"
          >
            ⠿
          </button>
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
            className="min-w-0 flex-1 rounded bg-transparent px-1 -mx-1 text-xs font-medium text-zinc-500 focus:text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:text-white dark:focus:ring-zinc-700"
          />
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {allGroups.length > 0 && (
            <select
              value={field.groupId ?? UNGROUPED}
              onChange={(e) =>
                onMoveField(field, e.target.value === UNGROUPED ? null : e.target.value)
              }
              title="Move to group"
              className="text-xs bg-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 focus:outline-none max-w-20"
            >
              <option value={UNGROUPED}>Ungrouped</option>
              {allGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="text-xs text-zinc-300 hover:text-red-600 dark:text-zinc-700 dark:hover:text-red-400"
            title="Delete field"
          >
            ×
          </button>
        </span>
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
    </div>
  );
}
