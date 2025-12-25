import { NextResponse } from "next/server";

import { getLockDeviceId } from "@/lib/lock-device";
import { markActivity } from "@/lib/lock-state";

export const dynamic = "force-dynamic";

export async function POST() {
  const state = await markActivity(await getLockDeviceId());
  return NextResponse.json({ locked: state.locked });
}
