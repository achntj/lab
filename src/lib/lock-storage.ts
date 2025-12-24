export type LockSettings = {
  pinHash?: string;
  pinSalt?: string;
  biometricCredentialId?: string;
};

const STORAGE_KEY = "personal-lab-lock-settings";

export function loadLockSettings(): LockSettings {
  if (typeof window === "undefined") {
    return {};
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {};
  }
  try {
    const parsed = JSON.parse(stored) as Partial<LockSettings>;
    return {
      pinHash: parsed.pinHash,
      pinSalt: parsed.pinSalt,
      biometricCredentialId: parsed.biometricCredentialId,
    };
  } catch {
    return {};
  }
}

export function saveLockSettings(settings: LockSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearLockSettings() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
