import { randomUUID } from "crypto";
import path from "path";
import supabase, { DOCUMENTS_BUCKET } from "./supabase";
import type { LibraryDocument, DocumentCategory } from "./types";

interface Row {
  id: string;
  filename: string;
  category: string;
  storage_path: string;
  mime_type: string | null;
  size: number;
  note: string | null;
  uploaded_at: string;
}

function mapRow(row: Row): LibraryDocument {
  return {
    id: row.id,
    filename: row.filename,
    category: row.category as DocumentCategory,
    storedName: row.storage_path,
    mimeType: row.mime_type,
    size: row.size,
    note: row.note,
    uploadedAt: row.uploaded_at,
  };
}

export async function listLibraryDocuments(): Promise<LibraryDocument[]> {
  const { data, error } = await supabase
    .from("document_library")
    .select("*")
    .order("uploaded_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export async function getLibraryDocument(
  id: string
): Promise<LibraryDocument | undefined> {
  const { data, error } = await supabase
    .from("document_library")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Row) : undefined;
}

export async function saveLibraryDocument(
  file: File,
  category: DocumentCategory,
  note: string | null
): Promise<LibraryDocument> {
  const id = randomUUID();
  const ext = path.extname(file.name);
  const storagePath = `library/${id}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("document_library")
    .insert({
      id,
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

export async function getLibraryDownloadUrl(doc: LibraryDocument): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storedName, 60, { download: doc.filename });
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteLibraryDocument(id: string): Promise<void> {
  const doc = await getLibraryDocument(id);
  if (!doc) return;
  // documents.library_document_id is ON DELETE CASCADE, so every school's
  // linked copy of this file is removed automatically.
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.storedName]);
  const { error } = await supabase.from("document_library").delete().eq("id", id);
  if (error) throw error;
}
