import { NextResponse } from "next/server";

import { getLockDeviceId } from "@/lib/lock-device";
import { unlockNow } from "@/lib/lock-state";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await unlockNow(getLockDeviceId());
  return NextResponse.json({ locked: state.locked });
}
