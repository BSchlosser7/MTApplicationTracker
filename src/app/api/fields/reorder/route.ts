import { NextRequest, NextResponse } from "next/server";
import { reorderFields } from "@/lib/customFields";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds : null;
  if (!orderedIds || orderedIds.some((id: unknown) => typeof id !== "string")) {
    return NextResponse.json({ error: "orderedIds must be a string array" }, { status: 400 });
  }
  const fields = await reorderFields(orderedIds);
  return NextResponse.json(fields);
}
