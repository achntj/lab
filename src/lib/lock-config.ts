import { promises as fs } from "fs";
import path from "path";

import { resolveDeviceId } from "@/lib/lock-device-shared";
import { getLockRoot, LEGACY_CONFIG_PATH } from "@/lib/lock-paths";

type LockConfig = {
  enabled: boolean;
  updatedAt: string;
};

function getConfigPath(deviceId?: string | null) {
  return path.join(getLockRoot(), resolveDeviceId(deviceId), "config.json");
}

async function readConfigFile(filePath: string): Promise<LockConfig | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LockConfig>;
    if (typeof parsed.enabled !== "boolean") return null;
    const updatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString();
    return { enabled: parsed.enabled, updatedAt };
  } catch {
    return null;
  }
}

async function writeConfigFile(filePath: string, payload: LockConfig) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function readLockConfig(deviceId?: string | null): Promise<LockConfig | null> {
  const devicePath = getConfigPath(deviceId);
  const config = await readConfigFile(devicePath);
  if (config) return config;

  const legacy = await readConfigFile(LEGACY_CONFIG_PATH);
  if (legacy) {
    await writeConfigFile(devicePath, legacy);
    return legacy;
  }

  return null;
}

export async function writeLockConfig(deviceId: string | null | undefined, enabled: boolean) {
  const payload: LockConfig = {
    enabled,
    updatedAt: new Date().toISOString(),
  };
  await writeConfigFile(getConfigPath(deviceId), payload);
}
