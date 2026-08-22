import { NextRequest, NextResponse } from "next/server";
import { getDocument, getDownloadUrl, deleteDocument } from "@/lib/documents";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await getDownloadUrl(doc);
  return NextResponse.redirect(url);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteDocument(id);
  return NextResponse.json({ ok: true });
}
