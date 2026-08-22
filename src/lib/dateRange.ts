export interface DateRange {
  start: string | null;
  end: string | null;
}

export function parseDateRangeValue(value: string | null | undefined): DateRange {
  if (!value) return { start: null, end: null };
  try {
    const parsed = JSON.parse(value);
    return {
      start: typeof parsed.start === "string" ? parsed.start : null,
      end: typeof parsed.end === "string" ? parsed.end : null,
    };
  } catch {
    return { start: null, end: null };
  }
}

export function serializeDateRangeValue(range: DateRange): string | null {
  if (!range.start && !range.end) return null;
  return JSON.stringify(range);
}
