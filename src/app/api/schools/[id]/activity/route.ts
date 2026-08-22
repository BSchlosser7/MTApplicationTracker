import { NextRequest, NextResponse } from "next/server";
import { listActivity, addNote } from "@/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return NextResponse.json(await listActivity(id));
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  if (!body.note || typeof body.note !== "string" || !body.note.trim()) {
    return NextResponse.json({ error: "Note is required" }, { status: 400 });
  }
  const entry = await addNote(id, body.note.trim());
  return NextResponse.json(entry, { status: 201 });
}
