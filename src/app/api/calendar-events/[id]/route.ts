import { NextRequest, NextResponse } from "next/server";
import { updateEvent, deleteEvent } from "@/lib/calendarEvents";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const patch: { title?: string; date?: string; note?: string | null; schoolId?: string | null } =
    {};
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    patch.title = title;
  }
  if (typeof body.date === "string") {
    if (!body.date.trim()) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    patch.date = body.date;
  }
  if ("note" in body) {
    patch.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  }
  if ("schoolId" in body) {
    patch.schoolId = typeof body.schoolId === "string" && body.schoolId ? body.schoolId : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const event = await updateEvent(id, patch);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(event);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteEvent(id);
  return NextResponse.json({ ok: true });
}
