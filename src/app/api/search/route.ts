import { NextResponse } from "next/server";

import { isLocked } from "@/lib/lock-guard";
import { searchRecords } from "@/lib/search";

export async function GET(req: Request) {
  if (await isLocked()) {
    return NextResponse.json({ error: "Locked." }, { status: 423 });
  }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchRecords(q);
  return NextResponse.json({ results });
}
