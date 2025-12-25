import { cookies, headers } from "next/headers";

import { LOCK_DEVICE_COOKIE, normalizeDeviceId } from "@/lib/lock-device-shared";

export { LOCK_DEVICE_COOKIE, normalizeDeviceId, resolveDeviceId } from "@/lib/lock-device-shared";

export function getLockDeviceId(): string | null {
  try {
    const cookieValue = cookies().get(LOCK_DEVICE_COOKIE)?.value;
    const fromCookie = normalizeDeviceId(cookieValue);
    if (fromCookie) return fromCookie;
    return normalizeDeviceId(headers().get("x-lock-device-id"));
  } catch {
    return null;
  }
}
