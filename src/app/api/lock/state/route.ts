import { NextResponse } from "next/server";

import { LOCK_IDLE_MINUTES } from "@/config/lock";
import { getLockState } from "@/lib/lock-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getLockState();
  return NextResponse.json({
    locked: state.locked,
    enabled: state.enabled,
    idleMinutes: LOCK_IDLE_MINUTES,
  });
}
