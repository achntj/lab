import { NextResponse } from "next/server";

import { lockNow } from "@/lib/lock-state";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await lockNow();
  return NextResponse.json({ locked: state.locked });
}
