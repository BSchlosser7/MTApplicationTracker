import { NextRequest, NextResponse } from "next/server";
import { listSchools, createSchool } from "@/lib/schools";
import { logStatusChange } from "@/lib/activity";

export async function GET() {
  return NextResponse.json(await listSchools());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const school = await createSchool(body);
  await logStatusChange(school.id, null, school.status);
  return NextResponse.json(school, { status: 201 });
}
