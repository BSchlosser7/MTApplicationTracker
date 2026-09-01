import { NextRequest, NextResponse } from "next/server";
import { updateField, deleteField } from "@/lib/customFields";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const patch: { label?: string; groupId?: string | null } = {};
  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label) {
      return NextResponse.json({ error: "Label is required" }, { status: 400 });
    }
    patch.label = label;
  }
  if ("groupId" in body) {
    patch.groupId = body.groupId === null ? null : String(body.groupId);
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const field = await updateField(id, patch);
  if (!field) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(field);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteField(id);
  return NextResponse.json({ ok: true });
}
