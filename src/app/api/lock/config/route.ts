import { NextResponse } from "next/server";

import { getLockDeviceId } from "@/lib/lock-device";
import { writeLockConfig } from "@/lib/lock-config";

type LockConfigPayload = {
  enabled?: unknown;
};

export async function POST(request: Request) {
  let payload: LockConfigPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof payload.enabled !== "boolean") {
    return NextResponse.json({ error: "Missing enabled flag." }, { status: 400 });
  }

  await writeLockConfig(getLockDeviceId(), payload.enabled);
  return NextResponse.json({ enabled: payload.enabled });
}
