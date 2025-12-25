import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getLockDeviceId } from "@/lib/lock-device";
import { isDevicePersisted, LOCK_VERIFIED_COOKIE, markDeviceVerified } from "@/lib/lock-verification";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let persist = false;
  let passphrase: string | null = null;
  try {
    const payload = (await request.json()) as { persist?: boolean; passphrase?: string };
    persist = payload?.persist === true;
    passphrase = typeof payload?.passphrase === "string" ? payload.passphrase : null;
  } catch {
    persist = false;
  }

  let hasSession = false;
  try {
    const store = await cookies();
    hasSession = store.get(LOCK_VERIFIED_COOKIE)?.value === "1";
  } catch {
    hasSession = false;
  }

  const deviceId = await getLockDeviceId();
  const alreadyPersisted = await isDevicePersisted(deviceId);
  if (!hasSession && !alreadyPersisted) {
    const configured = process.env.PERSONAL_LAB_VERIFICATION_PASSPHRASE;
    if (!configured) {
      return NextResponse.json(
        { error: "Verification passphrase is not configured." },
        { status: 500 },
      );
    }
    if (!passphrase || !matchesPassphrase(passphrase, configured)) {
      return NextResponse.json({ error: "Invalid passphrase." }, { status: 401 });
    }
  }

  if (persist) {
    await markDeviceVerified(deviceId);
  }

  const response = NextResponse.json({ verified: true, persisted: persist });
  const isSecure = request.url.startsWith("https://");
  response.cookies.set(LOCK_VERIFIED_COOKIE, "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
  });
  return response;
}

function matchesPassphrase(input: string, expected: string): boolean {
  const inputBuffer = Buffer.from(input, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (inputBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(inputBuffer, expectedBuffer);
}
