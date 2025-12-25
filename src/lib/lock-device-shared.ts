export const LOCK_DEVICE_COOKIE = "personal-lab-device-id";

const DEVICE_ID_PATTERN = /^[A-Za-z0-9-]{16,64}$/;
const FALLBACK_DEVICE_ID = "default";

export function normalizeDeviceId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return DEVICE_ID_PATTERN.test(trimmed) ? trimmed : null;
}

export function resolveDeviceId(value: string | null | undefined): string {
  return normalizeDeviceId(value) ?? FALLBACK_DEVICE_ID;
}
