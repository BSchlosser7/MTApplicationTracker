import supabase from "./supabase";
import type { CustomField, CustomFieldType, CustomFieldValue } from "./types";

interface FieldRow {
  id: string;
  label: string;
  type: string;
  sort_order: number;
  group_id: string | null;
  created_at: string;
}

interface ValueRow {
  school_id: string;
  field_id: string;
  value: string | null;
  updated_at: string;
}

function mapField(row: FieldRow): CustomField {
  return {
    id: row.id,
    label: row.label,
    type: row.type as CustomFieldType,
    sortOrder: row.sort_order,
    groupId: row.group_id,
    createdAt: row.created_at,
  };
}

function mapValue(row: ValueRow): CustomFieldValue {
  return {
    schoolId: row.school_id,
    fieldId: row.field_id,
    value: row.value,
    updatedAt: row.updated_at,
  };
}

export async function listFields(): Promise<CustomField[]> {
  const { data, error } = await supabase
    .from("custom_fields")
    .select("*, field_groups(sort_order)");
  if (error) throw error;

  const rows = data as (FieldRow & { field_groups: { sort_order: number } | null })[];
  rows.sort((a, b) => {
    const groupA = a.field_groups?.sort_order ?? Number.POSITIVE_INFINITY;
    const groupB = b.field_groups?.sort_order ?? Number.POSITIVE_INFINITY;
    if (groupA !== groupB) return groupA - groupB;
    return a.sort_order - b.sort_order;
  });
  return rows.map(mapField);
}

export async function createField(
  label: string,
  type: CustomFieldType
): Promise<CustomField> {
  const { data: maxRow } = await supabase
    .from("custom_fields")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("custom_fields")
    .insert({ label, type, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return mapField(data as FieldRow);
}

export async function updateField(
  id: string,
  patch: { label?: string; groupId?: string | null }
): Promise<CustomField | undefined> {
  const update: Record<string, unknown> = {};
  if (patch.label !== undefined) update.label = patch.label;
  if (patch.groupId !== undefined) update.group_id = patch.groupId;
  if (Object.keys(update).length === 0) return undefined;

  const { data, error } = await supabase
    .from("custom_fields")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapField(data as FieldRow) : undefined;
}

export async function deleteField(id: string): Promise<void> {
  const { error } = await supabase.from("custom_fields").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderFields(
  orderedIds: string[],
  groupId?: string | null
): Promise<CustomField[]> {
  await Promise.all(
    orderedIds.map((id, index) => {
      const update: Record<string, unknown> = { sort_order: index };
      if (groupId !== undefined) update.group_id = groupId;
      return supabase.from("custom_fields").update(update).eq("id", id);
    })
  );
  return listFields();
}

export async function listAllValues(): Promise<CustomFieldValue[]> {
  const { data, error } = await supabase.from("custom_field_values").select("*");
  if (error) throw error;
  return (data as ValueRow[]).map(mapValue);
}

export async function listValuesForSchool(
  schoolId: string
): Promise<CustomFieldValue[]> {
  const { data, error } = await supabase
    .from("custom_field_values")
    .select("*")
    .eq("school_id", schoolId);
  if (error) throw error;
  return (data as ValueRow[]).map(mapValue);
}

export async function upsertValue(
  schoolId: string,
  fieldId: string,
  value: string | null
): Promise<void> {
  const { error } = await supabase
    .from("custom_field_values")
    .upsert(
      {
        school_id: schoolId,
        field_id: fieldId,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "school_id,field_id" }
    );
  if (error) throw error;
}
