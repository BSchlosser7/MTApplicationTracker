import supabase from "./supabase";
import type { ActivityRow } from "./types";

interface Row {
  id: string;
  school_id: string;
  type: "status_change" | "note";
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
}

function mapRow(row: Row): ActivityRow {
  return {
    id: row.id,
    schoolId: row.school_id,
    type: row.type,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function listActivity(schoolId: string): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export async function listAllActivity(): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export async function logStatusChange(
  schoolId: string,
  fromStatus: string | null,
  toStatus: string
): Promise<void> {
  const { error } = await supabase.from("activity_log").insert({
    school_id: schoolId,
    type: "status_change",
    from_status: fromStatus,
    to_status: toStatus,
  });
  if (error) throw error;
}

export async function addNote(schoolId: string, note: string): Promise<ActivityRow> {
  const { data, error } = await supabase
    .from("activity_log")
    .insert({ school_id: schoolId, type: "note", note })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data as Row);
}
