export const STATUS_OPTIONS = [
  "Not Started",
  "Researching",
  "In Progress",
  "Prescreen Submitted",
  "Application Submitted",
  "Accepted",
  "Waitlisted",
  "Rejected",
  "Withdrawn",
] as const;

export type Status = (typeof STATUS_OPTIONS)[number];

export const DOCUMENT_CATEGORIES = [
  "Video",
  "Essay",
  "Resume",
  "Headshot",
  "Transcript",
  "Other",
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface School {
  id: string;
  name: string;
  website: string | null;
  status: Status;
  applicationDeadline: string | null;
  prescreenDeadline: string | null;
  howToApply: string | null;
  songRequirements: string | null;
  actingRequirements: string | null;
  danceRequirements: string | null;
  wildCardRequirements: string | null;
  filmingNotes: string | null;
  actingVideoLength: string | null;
  songVideoLength: string | null;
  danceVideoLength: string | null;
  slateRequirements: string | null;
  essayPrompts: string | null;
  generalNotes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRow {
  id: string;
  schoolId: string;
  category: DocumentCategory;
  filename: string;
  storedName: string;
  mimeType: string | null;
  size: number;
  note: string | null;
  uploadedAt: string;
}

export interface ActivityRow {
  id: string;
  schoolId: string;
  type: "status_change" | "note";
  fromStatus: string | null;
  toStatus: string | null;
  note: string | null;
  createdAt: string;
}

export const CUSTOM_FIELD_TYPES = ["text", "longtext", "date", "url"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  longtext: "Long Text",
  date: "Date",
  url: "Link",
};

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  sortOrder: number;
  createdAt: string;
}

export interface CustomFieldValue {
  schoolId: string;
  fieldId: string;
  value: string | null;
  updatedAt: string;
}

export const REQUIREMENT_FIELDS: { key: keyof School; label: string }[] = [
  { key: "howToApply", label: "How to Apply" },
  { key: "songRequirements", label: "Song Requirements" },
  { key: "actingRequirements", label: "Acting Requirements" },
  { key: "danceRequirements", label: "Dance Requirements" },
  { key: "wildCardRequirements", label: "Wild Card Requirements" },
  { key: "filmingNotes", label: "Notes on How to Film" },
  { key: "actingVideoLength", label: "Acting Video Length" },
  { key: "songVideoLength", label: "Song Video Length" },
  { key: "danceVideoLength", label: "Dance Video Length" },
  { key: "slateRequirements", label: "Slate Requirements" },
  { key: "essayPrompts", label: "Essay Prompts" },
  { key: "generalNotes", label: "General Notes" },
];
