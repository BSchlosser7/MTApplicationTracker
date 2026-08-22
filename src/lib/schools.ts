import supabase from "./supabase";
import type { School } from "./types";

interface SchoolRow {
  id: string;
  name: string;
  website: string | null;
  status: string;
  application_deadline: string | null;
  prescreen_deadline: string | null;
  how_to_apply: string | null;
  song_requirements: string | null;
  acting_requirements: string | null;
  dance_requirements: string | null;
  wild_card_requirements: string | null;
  filming_notes: string | null;
  acting_video_length: string | null;
  song_video_length: string | null;
  dance_video_length: string | null;
  slate_requirements: string | null;
  essay_prompts: string | null;
  general_notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const COLUMN_MAP: Record<keyof School, keyof SchoolRow | null> = {
  id: "id",
  name: "name",
  website: "website",
  status: "status",
  applicationDeadline: "application_deadline",
  prescreenDeadline: "prescreen_deadline",
  howToApply: "how_to_apply",
  songRequirements: "song_requirements",
  actingRequirements: "acting_requirements",
  danceRequirements: "dance_requirements",
  wildCardRequirements: "wild_card_requirements",
  filmingNotes: "filming_notes",
  actingVideoLength: "acting_video_length",
  songVideoLength: "song_video_length",
  danceVideoLength: "dance_video_length",
  slateRequirements: "slate_requirements",
  essayPrompts: "essay_prompts",
  generalNotes: "general_notes",
  sortOrder: "sort_order",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

function mapRow(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    website: row.website,
    status: row.status as School["status"],
    applicationDeadline: row.application_deadline,
    prescreenDeadline: row.prescreen_deadline,
    howToApply: row.how_to_apply,
    songRequirements: row.song_requirements,
    actingRequirements: row.acting_requirements,
    danceRequirements: row.dance_requirements,
    wildCardRequirements: row.wild_card_requirements,
    filmingNotes: row.filming_notes,
    actingVideoLength: row.acting_video_length,
    songVideoLength: row.song_video_length,
    danceVideoLength: row.dance_video_length,
    slateRequirements: row.slate_requirements,
    essayPrompts: row.essay_prompts,
    generalNotes: row.general_notes,
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
      website: data.website ?? null,
      status: data.status ?? "Not Started",
      application_deadline: data.applicationDeadline ?? null,
      prescreen_deadline: data.prescreenDeadline ?? null,
      sort_order: nextOrder,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(row as SchoolRow);
}

const EDITABLE_FIELDS: (keyof School)[] = [
  "name",
  "website",
  "status",
  "applicationDeadline",
  "prescreenDeadline",
  "howToApply",
  "songRequirements",
  "actingRequirements",
  "danceRequirements",
  "wildCardRequirements",
  "filmingNotes",
  "actingVideoLength",
  "songVideoLength",
  "danceVideoLength",
  "slateRequirements",
  "essayPrompts",
  "generalNotes",
];

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
