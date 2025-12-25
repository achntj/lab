import { promises as fs } from "fs";
import path from "path";

import { LOCK_IDLE_MINUTES } from "@/config/lock";
import { readLockConfig } from "@/lib/lock-config";
import { resolveDeviceId } from "@/lib/lock-device-shared";

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

const LOCK_ROOT = path.join(process.cwd(), "Library", "lock");
const LEGACY_STATE_PATH = path.join(process.cwd(), "Library", "lock-state.json");

function getStatePath(deviceId?: string | null) {
  return path.join(LOCK_ROOT, resolveDeviceId(deviceId), "state.json");
}

async function readStateFile(filePath: string): Promise<Omit<LockState, "enabled"> | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LockStateFile>;
    const locked = typeof parsed.locked === "boolean" ? parsed.locked : DEFAULT_STATE.locked;
    const lastActivityAt =
      typeof parsed.lastActivityAt === "number" ? parsed.lastActivityAt : DEFAULT_STATE.lastActivityAt;
    return { locked, lastActivityAt };
  } catch {
    return null;
  }
}

async function readStoredState(deviceId?: string | null): Promise<Omit<LockState, "enabled">> {
  const devicePath = getStatePath(deviceId);
  const state = await readStateFile(devicePath);
  if (state) return state;

  const legacy = await readStateFile(LEGACY_STATE_PATH);
  if (legacy) {
    await writeStoredState(deviceId, legacy);
    return legacy;
  }

  return { locked: DEFAULT_STATE.locked, lastActivityAt: DEFAULT_STATE.lastActivityAt };
}

async function writeStoredState(deviceId: string | null | undefined, state: Omit<LockState, "enabled">) {
  const payload: LockStateFile = {
    locked: state.locked,
    lastActivityAt: state.lastActivityAt,
    updatedAt: new Date().toISOString(),
  };
  const statePath = getStatePath(deviceId);
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(payload, null, 2), "utf8");
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

async function isLockEnabled(deviceId?: string | null): Promise<boolean> {
  const config = await readLockConfig(deviceId);
  return Boolean(config?.enabled);
}

export async function getLockState(deviceId?: string | null): Promise<LockState> {
  const enabled = await isLockEnabled(deviceId);
  if (!enabled) {
    await writeStoredState(deviceId, { locked: false, lastActivityAt: null });
    return { locked: false, lastActivityAt: null, enabled: false };
  }
  const store = await readStoredState(deviceId);
  const next = applyIdleTimeout(store);
  if (next.locked !== store.locked || next.lastActivityAt !== store.lastActivityAt) {
    await writeStoredState(deviceId, next);
  }
  return { ...next, enabled };
}

export async function markActivity(deviceId?: string | null): Promise<LockState> {
  const enabled = await isLockEnabled(deviceId);
  if (!enabled) {
    await writeStoredState(deviceId, { locked: false, lastActivityAt: null });
    return { locked: false, lastActivityAt: null, enabled: false };
  }
  const store = await readStoredState(deviceId);
  const next = { ...store };
  if (!next.locked) {
    next.lastActivityAt = Date.now();
  }
  const withIdle = applyIdleTimeout(next);
  if (withIdle.locked !== store.locked || withIdle.lastActivityAt !== store.lastActivityAt) {
    await writeStoredState(deviceId, withIdle);
  }
  return { ...withIdle, enabled };
}

export async function lockNow(deviceId?: string | null): Promise<LockState> {
  const enabled = await isLockEnabled(deviceId);
  if (!enabled) {
    await writeStoredState(deviceId, { locked: false, lastActivityAt: null });
    return { locked: false, lastActivityAt: null, enabled: false };
  }
  const next = { locked: true, lastActivityAt: null };
  await writeStoredState(deviceId, next);
  return { ...applyIdleTimeout(next), enabled };
}

export async function unlockNow(deviceId?: string | null): Promise<LockState> {
  const enabled = await isLockEnabled(deviceId);
  if (!enabled) {
    await writeStoredState(deviceId, { locked: false, lastActivityAt: null });
    return { locked: false, lastActivityAt: null, enabled: false };
  }
  const next = { locked: false, lastActivityAt: Date.now() };
  await writeStoredState(deviceId, next);
  return { ...applyIdleTimeout(next), enabled };
}
