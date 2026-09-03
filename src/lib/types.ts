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
  status: Status;
  sortOrder: number;
  latitude: number | null;
  longitude: number | null;
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
  libraryDocumentId: string | null;
  uploadedAt: string;
}

export interface LibraryDocument {
  id: string;
  filename: string;
  category: DocumentCategory;
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

export const CUSTOM_FIELD_TYPES = ["text", "longtext", "date", "daterange", "url"] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "Text",
  longtext: "Long Text",
  date: "Date",
  daterange: "Date Window",
  url: "Link",
};

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  sortOrder: number;
  groupId: string | null;
  createdAt: string;
}

export interface FieldGroup {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  note: string | null;
  schoolId: string | null;
  createdAt: string;
}

export interface CustomFieldValue {
  schoolId: string;
  fieldId: string;
  value: string | null;
  updatedAt: string;
}
