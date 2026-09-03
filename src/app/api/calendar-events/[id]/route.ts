import { NextRequest, NextResponse } from "next/server";
import { deleteEvent } from "@/lib/calendarEvents";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await deleteEvent(id);
  return NextResponse.json({ ok: true });
}
