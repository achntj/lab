import { accessSync, constants, mkdirSync } from "fs";
import os from "os";
import path from "path";

const LEGACY_ROOT = path.join(process.cwd(), "Library");
const LEGACY_LOCK_ROOT = path.join(LEGACY_ROOT, "lock");
const LEGACY_CONFIG_PATH = path.join(LEGACY_ROOT, "lock.json");
const LEGACY_STATE_PATH = path.join(LEGACY_ROOT, "lock-state.json");

const STATE_HOME = process.env.XDG_STATE_HOME ?? path.join(os.homedir(), ".local", "state");
const USER_LOCK_ROOT = path.join(STATE_HOME, "personal-lab", "lock");
const TMP_LOCK_ROOT = path.join(os.tmpdir(), "personal-lab", "lock");

const ENV_LOCK_ROOT = process.env.PERSONAL_LAB_LOCK_ROOT;

let cachedRoot: string | null = null;

function ensureWritable(dir: string): boolean {
  try {
    mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function getLockRoot(): string {
  if (cachedRoot) return cachedRoot;

  const candidates: string[] = [];
  if (ENV_LOCK_ROOT) candidates.push(ENV_LOCK_ROOT);
  if (process.env.NODE_ENV === "production") {
    candidates.push(USER_LOCK_ROOT);
  }
  candidates.push(LEGACY_LOCK_ROOT, TMP_LOCK_ROOT);

  for (const candidate of candidates) {
    if (ensureWritable(candidate)) {
      cachedRoot = candidate;
      return candidate;
    }
  }

  cachedRoot = LEGACY_LOCK_ROOT;
  return cachedRoot;
}

export { LEGACY_CONFIG_PATH, LEGACY_STATE_PATH };
