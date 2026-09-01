import supabase from "./supabase";
import type { FieldGroup } from "./types";

interface GroupRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

function mapGroup(row: GroupRow): FieldGroup {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function listGroups(): Promise<FieldGroup[]> {
  const { data, error } = await supabase
    .from("field_groups")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as GroupRow[]).map(mapGroup);
}

export async function createGroup(name: string): Promise<FieldGroup> {
  const { data: maxRow } = await supabase
    .from("field_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("field_groups")
    .insert({ name, sort_order: nextOrder })
    .select()
    .single();
  if (error) throw error;
  return mapGroup(data as GroupRow);
}

export async function renameGroup(
  id: string,
  name: string
): Promise<FieldGroup | undefined> {
  const { data, error } = await supabase
    .from("field_groups")
    .update({ name })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapGroup(data as GroupRow) : undefined;
}

export async function deleteGroup(id: string): Promise<void> {
  // custom_fields.group_id is ON DELETE SET NULL, so its fields become
  // ungrouped automatically rather than being deleted.
  const { error } = await supabase.from("field_groups").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderGroups(orderedIds: string[]): Promise<FieldGroup[]> {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("field_groups").update({ sort_order: index }).eq("id", id)
    )
  );
  return listGroups();
}
