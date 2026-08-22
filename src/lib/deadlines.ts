import { differenceInCalendarDays, parseISO } from "date-fns";
import type { CustomField, CustomFieldValue, School } from "./types";
import { parseDateRangeValue } from "./dateRange";

export interface DeadlineEntry {
  schoolId: string;
  schoolName: string;
  type: string;
  date: string;
  daysUntil: number;
  kind: "date" | "window-start" | "window-end";
}

function daysUntil(dateStr: string, today: Date): number {
  return differenceInCalendarDays(parseISO(dateStr), today);
}

export function extractDeadlines(
  schools: School[],
  fields: CustomField[],
  values: CustomFieldValue[]
): DeadlineEntry[] {
  const today = new Date();
  const dateFieldLabels = new Map(
    fields.filter((f) => f.type === "date").map((f) => [f.id, f.label])
  );
  const rangeFieldLabels = new Map(
    fields.filter((f) => f.type === "daterange").map((f) => [f.id, f.label])
  );
  const schoolNames = new Map(schools.map((s) => [s.id, s.name]));

  const entries: DeadlineEntry[] = [];
  for (const v of values) {
    if (!v.value) continue;
    const schoolName = schoolNames.get(v.schoolId);
    if (!schoolName) continue;

    const dateLabel = dateFieldLabels.get(v.fieldId);
    if (dateLabel) {
      entries.push({
        schoolId: v.schoolId,
        schoolName,
        type: dateLabel,
        date: v.value,
        daysUntil: daysUntil(v.value, today),
        kind: "date",
      });
      continue;
    }

    const rangeLabel = rangeFieldLabels.get(v.fieldId);
    if (rangeLabel) {
      const { start, end } = parseDateRangeValue(v.value);
      if (start) {
        entries.push({
          schoolId: v.schoolId,
          schoolName,
          type: `${rangeLabel} — Opens`,
          date: start,
          daysUntil: daysUntil(start, today),
          kind: "window-start",
        });
      }
      if (end) {
        entries.push({
          schoolId: v.schoolId,
          schoolName,
          type: `${rangeLabel} — Due`,
          date: end,
          daysUntil: daysUntil(end, today),
          kind: "window-end",
        });
      }
    }
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
    if (d.kind === "window-start") return false; // a window opening in the past isn't "overdue"
    if (d.daysUntil >= 0) return false;
    const school = schools.find((s) => s.id === d.schoolId);
    return school ? activeStatuses.has(school.status) : false;
  });
}
