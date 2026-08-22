import { differenceInCalendarDays, parseISO } from "date-fns";
import type { CustomField, CustomFieldValue, School } from "./types";

export interface DeadlineEntry {
  schoolId: string;
  schoolName: string;
  type: string;
  date: string;
  daysUntil: number;
}

export function extractDeadlines(
  schools: School[],
  fields: CustomField[],
  values: CustomFieldValue[]
): DeadlineEntry[] {
  const today = new Date();
  const dateFields = new Map(
    fields.filter((f) => f.type === "date").map((f) => [f.id, f.label])
  );
  const schoolNames = new Map(schools.map((s) => [s.id, s.name]));

  const entries: DeadlineEntry[] = [];
  for (const v of values) {
    if (!v.value) continue;
    const label = dateFields.get(v.fieldId);
    const schoolName = schoolNames.get(v.schoolId);
    if (!label || !schoolName) continue;
    entries.push({
      schoolId: v.schoolId,
      schoolName,
      type: label,
      date: v.value,
      daysUntil: differenceInCalendarDays(parseISO(v.value), today),
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function upcomingDeadlines(
  schools: School[],
  fields: CustomField[],
  values: CustomFieldValue[],
  withinDays = 14
): DeadlineEntry[] {
  return extractDeadlines(schools, fields, values).filter(
    (d) => d.daysUntil >= 0 && d.daysUntil <= withinDays
  );
}

export function overdueDeadlines(
  schools: School[],
  fields: CustomField[],
  values: CustomFieldValue[]
): DeadlineEntry[] {
  const activeStatuses = new Set([
    "Not Started",
    "Researching",
    "In Progress",
  ]);
  return extractDeadlines(schools, fields, values).filter((d) => {
    if (d.daysUntil >= 0) return false;
    const school = schools.find((s) => s.id === d.schoolId);
    return school ? activeStatuses.has(school.status) : false;
  });
}
