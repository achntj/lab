import { NextResponse } from "next/server";

import { getLockDeviceId } from "@/lib/lock-device";
import { lockNow } from "@/lib/lock-state";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await lockNow(getLockDeviceId());
  return NextResponse.json({ locked: state.locked });
}
