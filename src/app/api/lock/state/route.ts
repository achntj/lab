import { NextResponse } from "next/server";

import { LOCK_IDLE_MINUTES } from "@/config/lock";
import { getLockDeviceId } from "@/lib/lock-device";
import { getLockState } from "@/lib/lock-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await getLockState(getLockDeviceId());
  return NextResponse.json({
    locked: state.locked,
    enabled: state.enabled,
    idleMinutes: LOCK_IDLE_MINUTES,
  });
}
