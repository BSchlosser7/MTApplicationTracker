import { randomUUID } from "crypto";
import path from "path";
import supabase, { DOCUMENTS_BUCKET } from "./supabase";
import type { DocumentRow, DocumentCategory } from "./types";

interface Row {
  id: string;
  school_id: string;
  category: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  size: number;
  note: string | null;
  uploaded_at: string;
}

function mapRow(row: Row): DocumentRow {
  return {
    id: row.id,
    schoolId: row.school_id,
    category: row.category as DocumentCategory,
    filename: row.filename,
    storedName: row.storage_path,
    mimeType: row.mime_type,
    size: row.size,
    note: row.note,
    uploadedAt: row.uploaded_at,
  };
}

export async function listDocuments(schoolId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("school_id", schoolId)
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export async function getDocument(id: string): Promise<DocumentRow | undefined> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Row) : undefined;
}

export async function saveDocument(
  schoolId: string,
  file: File,
  category: DocumentCategory,
  note: string | null
): Promise<DocumentRow> {
  const id = randomUUID();
  const ext = path.extname(file.name);
  const storagePath = `${schoolId}/${id}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      id,
      school_id: schoolId,
      category,
      filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      size: buffer.length,
      note,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data as Row);
}

export async function getDownloadUrl(doc: DocumentRow): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storedName, 60, { download: doc.filename });
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(id: string): Promise<void> {
  const doc = await getDocument(id);
  if (!doc) return;
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storedName]);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}
