import { NextRequest, NextResponse } from "next/server";
import { listLibraryDocuments, saveLibraryDocument } from "@/lib/documentLibrary";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await listLibraryDocuments());
}

export async function POST(req: NextRequest) {
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

  const doc = await saveLibraryDocument(
    file,
    category,
    typeof note === "string" && note.trim() ? note.trim() : null
  );

  return NextResponse.json(doc, { status: 201 });
}
