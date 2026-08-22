import { NextRequest, NextResponse } from "next/server";
import { getSchool, updateSchool, deleteSchool } from "@/lib/schools";
import { logStatusChange } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const school = await getSchool(id);
  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(school);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await getSchool(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await updateSchool(id, body);

  if (body.status && body.status !== existing.status) {
    await logStatusChange(id, existing.status, body.status);
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteSchool(id);
  return NextResponse.json({ ok: true });
}
