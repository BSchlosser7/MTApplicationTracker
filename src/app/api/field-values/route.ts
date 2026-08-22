import { NextRequest, NextResponse } from "next/server";
import { listAllValues, listValuesForSchool, upsertValue } from "@/lib/customFields";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");
  const values = schoolId ? await listValuesForSchool(schoolId) : await listAllValues();
  return NextResponse.json(values);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { schoolId, fieldId, value } = body;
  if (typeof schoolId !== "string" || typeof fieldId !== "string") {
    return NextResponse.json(
      { error: "schoolId and fieldId are required" },
      { status: 400 }
    );
  }
  await upsertValue(schoolId, fieldId, typeof value === "string" && value ? value : null);
  return NextResponse.json({ ok: true });
}
