import { NextRequest, NextResponse } from "next/server";
import { renameGroup, deleteGroup } from "@/lib/fieldGroups";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const group = await renameGroup(id, name);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(group);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteGroup(id);
  return NextResponse.json({ ok: true });
}
