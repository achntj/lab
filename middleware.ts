import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { LOCK_DEVICE_COOKIE } from "@/lib/lock-device-shared";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest) {
  const existing = request.cookies.get(LOCK_DEVICE_COOKIE)?.value;
  if (existing) {
    return NextResponse.next();
  }

  const deviceId = crypto.randomUUID();
  const headers = new Headers(request.headers);
  headers.set("x-lock-device-id", deviceId);
  const response = NextResponse.next({ request: { headers } });
  const isSecure = request.url.startsWith("https://");
  response.cookies.set(LOCK_DEVICE_COOKIE, deviceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    maxAge: ONE_YEAR_SECONDS,
  });
  return response;
}
