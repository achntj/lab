import { promises as fs } from "fs";
import path from "path";

import { LOCK_IDLE_MINUTES } from "@/config/lock";
import { readLockConfig } from "@/lib/lock-config";

type LockState = {
  locked: boolean;
  lastActivityAt: number | null;
  enabled: boolean;
};

const DEFAULT_STATE: LockState = {
  locked: true,
  lastActivityAt: null,
  enabled: false,
};

type LockStateFile = {
  locked: boolean;
  lastActivityAt: number | null;
  updatedAt: string;
};

const STATE_PATH = path.join(process.cwd(), "Library", "lock-state.json");

async function readStoredState(): Promise<Omit<LockState, "enabled">> {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LockStateFile>;
    const locked = typeof parsed.locked === "boolean" ? parsed.locked : DEFAULT_STATE.locked;
    const lastActivityAt =
      typeof parsed.lastActivityAt === "number" ? parsed.lastActivityAt : DEFAULT_STATE.lastActivityAt;
    return { locked, lastActivityAt };
  } catch {
    return { locked: DEFAULT_STATE.locked, lastActivityAt: DEFAULT_STATE.lastActivityAt };
  }
}

async function writeStoredState(state: Omit<LockState, "enabled">) {
  const payload: LockStateFile = {
    locked: state.locked,
    lastActivityAt: state.lastActivityAt,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

function applyIdleTimeout(state: Omit<LockState, "enabled">): Omit<LockState, "enabled"> {
  if (state.locked) return state;
  if (!state.lastActivityAt) {
    return { ...state, locked: true };
  }
  const idleMs = Math.max(1, LOCK_IDLE_MINUTES) * 60 * 1000;
  if (Date.now() - state.lastActivityAt >= idleMs) {
    return { ...state, locked: true };
  }
  return state;
}

async function isLockEnabled(): Promise<boolean> {
  const config = await readLockConfig();
  return Boolean(config?.enabled);
}

export async function getLockState(): Promise<LockState> {
  const enabled = await isLockEnabled();
  if (!enabled) {
    await writeStoredState({ locked: false, lastActivityAt: null });
    return { locked: false, lastActivityAt: null, enabled: false };
  }
  const store = await readStoredState();
  const next = applyIdleTimeout(store);
  if (next.locked !== store.locked || next.lastActivityAt !== store.lastActivityAt) {
    await writeStoredState(next);
  }
  return { ...next, enabled };
}

export async function markActivity(): Promise<LockState> {
  const enabled = await isLockEnabled();
  if (!enabled) {
    await writeStoredState({ locked: false, lastActivityAt: null });
    return { locked: false, lastActivityAt: null, enabled: false };
  }
  const store = await readStoredState();
  const next = { ...store };
  if (!next.locked) {
    next.lastActivityAt = Date.now();
  }
  const withIdle = applyIdleTimeout(next);
  if (withIdle.locked !== store.locked || withIdle.lastActivityAt !== store.lastActivityAt) {
    await writeStoredState(withIdle);
  }
  return { ...withIdle, enabled };
}

export async function lockNow(): Promise<LockState> {
  const enabled = await isLockEnabled();
  if (!enabled) {
    await writeStoredState({ locked: false, lastActivityAt: null });
    return { locked: false, lastActivityAt: null, enabled: false };
  }
  const next = { locked: true, lastActivityAt: null };
  await writeStoredState(next);
  return { ...applyIdleTimeout(next), enabled };
}

export async function unlockNow(): Promise<LockState> {
  const enabled = await isLockEnabled();
  if (!enabled) {
    await writeStoredState({ locked: false, lastActivityAt: null });
    return { locked: false, lastActivityAt: null, enabled: false };
  }
  const next = { locked: false, lastActivityAt: Date.now() };
  await writeStoredState(next);
  return { ...applyIdleTimeout(next), enabled };
}
