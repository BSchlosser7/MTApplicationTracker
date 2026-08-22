// One-time migration: copies data from the old local SQLite database
// (data/app.db) and uploaded files (uploads/) into a Supabase project.
//
// Run this AFTER creating your Supabase project and its schema
// (supabase/schema.sql), and AFTER filling in .env.local.
//
//   node scripts/migrate-to-supabase.mjs

import { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

// --- load .env.local manually (no dotenv dependency needed) ---
const envPath = path.join(projectRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) process.env[match[1]] ??= match[2].trim();
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const dbPath = path.join(projectRoot, "data", "app.db");
if (!fs.existsSync(dbPath)) {
  console.log("No local database found at data/app.db — nothing to migrate.");
  process.exit(0);
}

const sqlite = new DatabaseSync(dbPath, { readOnly: true });
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function all(sql) {
  return sqlite.prepare(sql).all();
}

async function main() {
  const schools = all("SELECT * FROM schools");
  const documents = all("SELECT * FROM documents");
  const activity = all("SELECT * FROM activity_log");
  const fields = all("SELECT * FROM custom_fields");
  const values = all("SELECT * FROM custom_field_values");

  console.log(
    `Found ${schools.length} schools, ${documents.length} documents, ${activity.length} activity entries, ${fields.length} custom fields, ${values.length} custom field values.`
  );

  if (schools.length > 0) {
    const { error } = await supabase.from("schools").insert(
      schools.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        sort_order: s.sortOrder,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      }))
    );
    if (error) throw error;
    console.log(`Migrated ${schools.length} schools.`);
  }

  if (fields.length > 0) {
    const { error } = await supabase.from("custom_fields").insert(
      fields.map((f) => ({
        id: f.id,
        label: f.label,
        type: f.type,
        sort_order: f.sortOrder,
        created_at: f.createdAt,
      }))
    );
    if (error) throw error;
    console.log(`Migrated ${fields.length} custom fields.`);
  }

  if (values.length > 0) {
    const { error } = await supabase.from("custom_field_values").insert(
      values.map((v) => ({
        school_id: v.schoolId,
        field_id: v.fieldId,
        value: v.value,
        updated_at: v.updatedAt,
      }))
    );
    if (error) throw error;
    console.log(`Migrated ${values.length} custom field values.`);
  }

  if (activity.length > 0) {
    const { error } = await supabase.from("activity_log").insert(
      activity.map((a) => ({
        id: a.id,
        school_id: a.schoolId,
        type: a.type,
        from_status: a.fromStatus,
        to_status: a.toStatus,
        note: a.note,
        created_at: a.createdAt,
      }))
    );
    if (error) throw error;
    console.log(`Migrated ${activity.length} activity entries.`);
  }

  for (const doc of documents) {
    const filePath = path.join(projectRoot, "uploads", doc.schoolId, doc.storedName);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping "${doc.filename}" — file missing on disk at ${filePath}`);
      continue;
    }
    const buffer = fs.readFileSync(filePath);
    const storagePath = `${doc.schoolId}/${doc.id}${path.extname(doc.storedName)}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: doc.mimeType || "application/octet-stream",
      });
    if (uploadError) throw uploadError;

    const { error } = await supabase.from("documents").insert({
      id: doc.id,
      school_id: doc.schoolId,
      category: doc.category,
      filename: doc.filename,
      storage_path: storagePath,
      mime_type: doc.mimeType,
      size: doc.size,
      note: doc.note,
      uploaded_at: doc.uploadedAt,
    });
    if (error) throw error;
    console.log(`Migrated document "${doc.filename}".`);
  }

  console.log("Migration complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
