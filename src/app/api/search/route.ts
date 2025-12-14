import { NextResponse } from "next/server";

import { searchRecords } from "@/lib/search";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const results = q ? await searchRecords(q) : [];
  return NextResponse.json({ results });
}
