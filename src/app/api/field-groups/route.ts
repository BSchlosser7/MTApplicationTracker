import { NextRequest, NextResponse } from "next/server";
import { listGroups, createGroup } from "@/lib/fieldGroups";

export async function GET() {
  return NextResponse.json(await listGroups());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const group = await createGroup(name);
  return NextResponse.json(group, { status: 201 });
}
