import { promises as fs } from "fs";
import path from "path";
import { cookies } from "next/headers";

import { readLockConfig } from "@/lib/lock-config";
import { resolveDeviceId } from "@/lib/lock-device-shared";
import { getLockRoot } from "@/lib/lock-paths";

export const LOCK_VERIFIED_COOKIE = "personal-lab-verified";

type VerificationState = {
  verified: boolean;
  verifiedAt: string;
};

function getVerificationPath(deviceId?: string | null) {
  return path.join(getLockRoot(), resolveDeviceId(deviceId), "verification.json");
}

async function readVerificationFile(filePath: string): Promise<VerificationState | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<VerificationState>;
    if (typeof parsed.verified !== "boolean") return null;
    const verifiedAt = typeof parsed.verifiedAt === "string" ? parsed.verifiedAt : new Date(0).toISOString();
    return { verified: parsed.verified, verifiedAt };
  } catch {
    return null;
  }
}

async function writeVerificationFile(filePath: string, payload: VerificationState) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

async function hasSessionVerification(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(LOCK_VERIFIED_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

export async function isDeviceVerified(deviceId?: string | null): Promise<boolean> {
  if (await hasSessionVerification()) return true;
  if (!deviceId) return false;
  const config = await readLockConfig(deviceId);
  if (!config?.enabled) return false;
  const state = await readVerificationFile(getVerificationPath(deviceId));
  return Boolean(state?.verified);
}

export async function isDevicePersisted(deviceId?: string | null): Promise<boolean> {
  if (!deviceId) return false;
  const state = await readVerificationFile(getVerificationPath(deviceId));
  return Boolean(state?.verified);
}

export async function markDeviceVerified(deviceId?: string | null): Promise<VerificationState> {
  const payload: VerificationState = {
    verified: true,
    verifiedAt: new Date().toISOString(),
  };
  const filePath = getVerificationPath(deviceId);
  await writeVerificationFile(filePath, payload);
  return payload;
}
