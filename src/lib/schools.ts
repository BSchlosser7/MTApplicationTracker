import supabase from "./supabase";
import type { School } from "./types";

interface SchoolRow {
  id: string;
  name: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const COLUMN_MAP: Record<keyof School, keyof SchoolRow | null> = {
  id: "id",
  name: "name",
  status: "status",
  sortOrder: "sort_order",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

function mapRow(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    status: row.status as School["status"],
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSchools(): Promise<School[]> {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as SchoolRow[]).map(mapRow);
}

export async function getSchool(id: string): Promise<School | undefined> {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as SchoolRow) : undefined;
}

export async function createSchool(data: Partial<School>): Promise<School> {
  const { data: maxRow } = await supabase
    .from("schools")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { data: row, error } = await supabase
    .from("schools")
    .insert({
      name: data.name ?? "New School",
      status: data.status ?? "Not Started",
      sort_order: nextOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(row as SchoolRow);
}

const EDITABLE_FIELDS: (keyof School)[] = ["name", "status"];

export async function updateSchool(
  id: string,
  data: Partial<School>
): Promise<School | undefined> {
  const fields = EDITABLE_FIELDS.filter((f) => f in data);
  if (fields.length === 0) return getSchool(id);

  const update: Record<string, unknown> = {};
  for (const f of fields) {
    const column = COLUMN_MAP[f];
    if (column) update[column] = data[f] ?? null;
  }
  update.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from("schools")
    .update(update)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return row ? mapRow(row as SchoolRow) : undefined;
}

export async function deleteSchool(id: string): Promise<void> {
  const { error } = await supabase.from("schools").delete().eq("id", id);
  if (error) throw error;
}
