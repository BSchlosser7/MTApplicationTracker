import { listSchools } from "./schools";
import { listFields, listAllValues } from "./customFields";
import { listAllActivity } from "./activity";
import { listAllDocuments } from "./documents";
import type { ActivityRow, DocumentRow } from "./types";

export async function buildDataSnapshot() {
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

  return {
    note: "Structured tracker data. Uploaded document files themselves are not included, only filenames/categories/notes.",
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
}
