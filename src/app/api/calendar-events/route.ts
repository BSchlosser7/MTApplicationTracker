import { NextRequest, NextResponse } from "next/server";
import { listEvents, createEvent } from "@/lib/calendarEvents";

export async function GET() {
  return NextResponse.json(await listEvents());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  if (!title || !date) {
    return NextResponse.json({ error: "title and date are required" }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
  const schoolId = typeof body.schoolId === "string" && body.schoolId ? body.schoolId : null;

  const event = await createEvent({ title, date, note, schoolId });
  return NextResponse.json(event, { status: 201 });
}
