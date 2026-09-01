import { NextRequest, NextResponse } from "next/server";
import { reorderGroups } from "@/lib/fieldGroups";

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds : null;
  if (!orderedIds || orderedIds.some((id: unknown) => typeof id !== "string")) {
    return NextResponse.json({ error: "orderedIds must be a string array" }, { status: 400 });
  }
  const groups = await reorderGroups(orderedIds);
  return NextResponse.json(groups);
}
