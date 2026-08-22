import { NextRequest, NextResponse } from "next/server";
import { listFields, createField } from "@/lib/customFields";
import { CUSTOM_FIELD_TYPES, type CustomFieldType } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await listFields());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  const type: CustomFieldType = CUSTOM_FIELD_TYPES.includes(body.type)
    ? body.type
    : "text";

  const field = await createField(label, type);
  return NextResponse.json(field, { status: 201 });
}
