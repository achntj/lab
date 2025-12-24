import { promises as fs } from "fs";
import path from "path";

type LockConfig = {
  enabled: boolean;
  updatedAt: string;
};

const CONFIG_PATH = path.join(process.cwd(), "Library", "lock.json");

export async function readLockConfig(): Promise<LockConfig | null> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LockConfig>;
    if (typeof parsed.enabled !== "boolean") return null;
    const updatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString();
    return { enabled: parsed.enabled, updatedAt };
  } catch {
    return null;
  }
}

export async function writeLockConfig(enabled: boolean) {
  const payload: LockConfig = {
    enabled,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(payload, null, 2), "utf8");
}
