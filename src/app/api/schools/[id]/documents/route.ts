import { NextRequest, NextResponse } from "next/server";
import { listDocuments, saveDocument } from "@/lib/documents";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return NextResponse.json(await listDocuments(id));
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file");
  const categoryRaw = formData.get("category");
  const note = formData.get("note");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const category: DocumentCategory = DOCUMENT_CATEGORIES.includes(
    categoryRaw as DocumentCategory
  )
    ? (categoryRaw as DocumentCategory)
    : "Other";

  const doc = await saveDocument(
    id,
    file,
    category,
    typeof note === "string" && note.trim() ? note.trim() : null
  );

  return NextResponse.json(doc, { status: 201 });
}
