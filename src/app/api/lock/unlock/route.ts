import { NextResponse } from "next/server";

import { unlockNow } from "@/lib/lock-state";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await unlockNow();
  return NextResponse.json({ locked: state.locked });
}
