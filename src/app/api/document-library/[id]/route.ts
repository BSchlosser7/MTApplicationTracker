import { NextRequest, NextResponse } from "next/server";
import {
  getLibraryDocument,
  getLibraryDownloadUrl,
  deleteLibraryDocument,
} from "@/lib/documentLibrary";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const doc = await getLibraryDocument(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await getLibraryDownloadUrl(doc);
  return NextResponse.redirect(url);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteLibraryDocument(id);
  return NextResponse.json({ ok: true });
}
