import { NextRequest, NextResponse } from "next/server";
import { getSchool, updateSchool } from "@/lib/schools";
import { geocodeQuery } from "@/lib/geocode";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const school = await getSchool(id);
  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await geocodeQuery(school.name);
  if (!result) {
    return NextResponse.json({ found: false, school });
  }

  const updated = await updateSchool(id, {
    latitude: result.latitude,
    longitude: result.longitude,
  });
  return NextResponse.json({ found: true, school: updated });
}
