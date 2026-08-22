"use client";

import { useRef, useState } from "react";
import { mutate } from "swr";
import type { DocumentRow, DocumentCategory } from "@/lib/types";
import { DOCUMENT_CATEGORIES } from "@/lib/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPanel({
  schoolId,
  documents,
}: {
  schoolId: string;
  documents: DocumentRow[];
}) {
  const [category, setCategory] = useState<DocumentCategory>("Video");
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const key = `/api/schools/${schoolId}/documents`;

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    if (note.trim()) formData.append("note", note.trim());

    const res = await fetch(key, { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      setNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      mutate(key);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm("Delete this file?")) return;
    await fetch(`/api/documents/${docId}`, { method: "DELETE" });
    mutate(key);
  }

  const grouped = documents.reduce<Record<string, DocumentRow[]>>((acc, d) => {
    (acc[d.category] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className="px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
          >
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note (e.g. 'song cut for CMU')"
            className="flex-1 px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-zinc-900 file:text-white dark:file:bg-white dark:file:text-zinc-900 file:text-sm file:font-medium file:cursor-pointer cursor-pointer"
        />
        {uploading && <p className="text-xs text-zinc-500">Uploading…</p>}
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-zinc-500">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, docs]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                {cat}
              </h3>
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <a
                        href={`/api/documents/${d.id}`}
                        className="font-medium hover:underline truncate block"
                      >
                        {d.filename}
                      </a>
                      <div className="text-xs text-zinc-500">
                        {formatSize(d.size)}
                        {d.note ? ` — ${d.note}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <a
                        href={`/api/documents/${d.id}`}
                        className="text-xs text-zinc-500 hover:underline"
                      >
                        Download
                      </a>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
