import { differenceInCalendarDays, parseISO } from "date-fns";
import type { School } from "./types";

export interface DeadlineEntry {
  schoolId: string;
  schoolName: string;
  type: "Application" | "Prescreen";
  date: string;
  daysUntil: number;
}

export function extractDeadlines(schools: School[]): DeadlineEntry[] {
  const today = new Date();
  const entries: DeadlineEntry[] = [];

  for (const s of schools) {
    if (s.applicationDeadline) {
      entries.push({
        schoolId: s.id,
        schoolName: s.name,
        type: "Application",
        date: s.applicationDeadline,
        daysUntil: differenceInCalendarDays(
          parseISO(s.applicationDeadline),
          today
        ),
      });
    }
    if (s.prescreenDeadline) {
      entries.push({
        schoolId: s.id,
        schoolName: s.name,
        type: "Prescreen",
        date: s.prescreenDeadline,
        daysUntil: differenceInCalendarDays(
          parseISO(s.prescreenDeadline),
          today
        ),
      });
    }
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export function upcomingDeadlines(
  schools: School[],
  withinDays = 14
): DeadlineEntry[] {
  return extractDeadlines(schools).filter(
    (d) => d.daysUntil >= 0 && d.daysUntil <= withinDays
  );
}

export function overdueDeadlines(schools: School[]): DeadlineEntry[] {
  const activeStatuses = new Set([
    "Not Started",
    "Researching",
    "In Progress",
  ]);
  return extractDeadlines(schools).filter((d) => {
    if (d.daysUntil >= 0) return false;
    const school = schools.find((s) => s.id === d.schoolId);
    return school ? activeStatuses.has(school.status) : false;
  });
}
