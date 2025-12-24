import { getLockState } from "@/lib/lock-state";

export async function isLocked(): Promise<boolean> {
  const state = await getLockState();
  return state.enabled && state.locked;
}

export async function assertUnlocked() {
  if (await isLocked()) {
    throw new Error("App is locked.");
  }
}
