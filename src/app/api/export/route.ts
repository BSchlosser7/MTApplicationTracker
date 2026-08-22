import { NextResponse } from "next/server";
import { listSchools } from "@/lib/schools";
import { listFields, listAllValues } from "@/lib/customFields";
import { listAllActivity } from "@/lib/activity";
import { listAllDocuments } from "@/lib/documents";
import type { ActivityRow, DocumentRow } from "@/lib/types";

export async function GET() {
  const [schools, fields, values, activity, documents] = await Promise.all([
    listSchools(),
    listFields(),
    listAllValues(),
    listAllActivity(),
    listAllDocuments(),
  ]);

  const fieldLabel = new Map(fields.map((f) => [f.id, f.label]));

  const fieldsBySchool = new Map<string, Record<string, string>>();
  for (const v of values) {
    if (!v.value) continue;
    const label = fieldLabel.get(v.fieldId);
    if (!label) continue;
    const entry = fieldsBySchool.get(v.schoolId) ?? {};
    entry[label] = v.value;
    fieldsBySchool.set(v.schoolId, entry);
  }

  const activityBySchool = new Map<string, ActivityRow[]>();
  for (const a of activity) {
    const arr = activityBySchool.get(a.schoolId) ?? [];
    arr.push(a);
    activityBySchool.set(a.schoolId, arr);
  }

  const documentsBySchool = new Map<string, DocumentRow[]>();
  for (const d of documents) {
    const arr = documentsBySchool.get(d.schoolId) ?? [];
    arr.push(d);
    documentsBySchool.set(d.schoolId, arr);
  }

  const bundle = {
    exportedAt: new Date().toISOString(),
    note: "Structured tracker data only. Uploaded document files themselves stay in Supabase Storage and aren't included here — this covers filenames/categories/notes so nothing is silently forgotten.",
    schools: schools.map((s) => ({
      name: s.name,
      status: s.status,
      fields: fieldsBySchool.get(s.id) ?? {},
      activity: (activityBySchool.get(s.id) ?? []).map((a) => ({
        type: a.type,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        note: a.note,
        date: a.createdAt,
      })),
      documents: (documentsBySchool.get(s.id) ?? []).map((d) => ({
        filename: d.filename,
        category: d.category,
        note: d.note,
        uploadedAt: d.uploadedAt,
      })),
    })),
  };

  const filename = `mt-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
