import { getLockDeviceId } from "@/lib/lock-device";
import { getLockState } from "@/lib/lock-state";

export async function isLocked(deviceId?: string | null): Promise<boolean> {
  const resolvedDeviceId = deviceId ?? (await getLockDeviceId());
  const state = await getLockState(resolvedDeviceId);
  return state.enabled && state.locked;
}

export async function assertUnlocked(deviceId?: string | null) {
  if (await isLocked(deviceId)) {
    throw new Error("App is locked.");
  }
}
