import { NextRequest, NextResponse } from "next/server";
import { attachLibraryDocument } from "@/lib/documents";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const libraryDocumentId =
    typeof body.libraryDocumentId === "string" ? body.libraryDocumentId : "";
  if (!libraryDocumentId) {
    return NextResponse.json({ error: "libraryDocumentId is required" }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  const doc = await attachLibraryDocument(id, libraryDocumentId, note);
  return NextResponse.json(doc, { status: 201 });
}
