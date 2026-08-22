import { NextRequest, NextResponse } from "next/server";
import { renameField, deleteField } from "@/lib/customFields";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  const field = await renameField(id, label);
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(field);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteField(id);
  return NextResponse.json({ ok: true });
}
