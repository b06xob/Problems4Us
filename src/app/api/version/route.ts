import { NextResponse } from "next/server";
import { getSiteVersion } from "@/lib/site-version";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(getSiteVersion());
}
