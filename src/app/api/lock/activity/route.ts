import { NextResponse } from "next/server";

import { markActivity } from "@/lib/lock-state";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await markActivity();
  return NextResponse.json({ locked: state.locked });
}
