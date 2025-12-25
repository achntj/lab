import { cookies, headers } from "next/headers";

import { LOCK_DEVICE_COOKIE, normalizeDeviceId } from "@/lib/lock-device-shared";

export { LOCK_DEVICE_COOKIE, normalizeDeviceId, resolveDeviceId } from "@/lib/lock-device-shared";

export async function getLockDeviceId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const cookieValue = cookieStore.get(LOCK_DEVICE_COOKIE)?.value;
    const fromCookie = normalizeDeviceId(cookieValue);
    if (fromCookie) return fromCookie;
    return normalizeDeviceId(headerStore.get("x-lock-device-id"));
  } catch {
    return null;
  }
}
