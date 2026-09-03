import supabase from "./supabase";
import type { CalendarEvent } from "./types";

interface EventRow {
  id: string;
  title: string;
  date: string;
  note: string | null;
  school_id: string | null;
  created_at: string;
}

function mapEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    note: row.note,
    schoolId: row.school_id,
    createdAt: row.created_at,
  };
}

export async function listEvents(): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return (data as EventRow[]).map(mapEvent);
}

export async function createEvent(input: {
  title: string;
  date: string;
  note?: string | null;
  schoolId?: string | null;
}): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      title: input.title,
      date: input.date,
      note: input.note ?? null,
      school_id: input.schoolId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapEvent(data as EventRow);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}
