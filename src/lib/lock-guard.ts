import { getLockDeviceId } from "@/lib/lock-device";
import { getLockState } from "@/lib/lock-state";
import { isDeviceVerified } from "@/lib/lock-verification";

export async function isLocked(deviceId?: string | null): Promise<boolean> {
  const resolvedDeviceId = deviceId ?? (await getLockDeviceId());
  const verified = await isDeviceVerified(resolvedDeviceId);
  if (!verified) return true;
  const state = await getLockState(resolvedDeviceId);
  return state.enabled && state.locked;
}

export async function assertUnlocked(deviceId?: string | null) {
  if (await isLocked(deviceId)) {
    throw new Error("App is locked.");
  }
}
