"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useHotkey } from "@/components/hotkeys/hotkey-provider";
import { LOCK_ACTIVITY_THROTTLE_MS, LOCK_POLL_INTERVAL_MS } from "@/config/lock";
import { LockSettings, loadLockSettings, saveLockSettings } from "@/lib/lock-storage";
import { createPinHash, hashPinWithSalt } from "@/lib/lock-crypto";
import {
  createBiometricCredential,
  isPlatformAuthenticatorAvailable,
  requestBiometricAssertion,
} from "@/lib/lock-webauthn";
import { LockScreen } from "./lock-screen";

type LockContextValue = {
  settings: LockSettings;
  isLocked: boolean;
  hasPin: boolean;
  hasBiometric: boolean;
  biometricAvailable: boolean;
  setPin: (pin: string) => Promise<void>;
  clearPin: () => void;
  verifyPin: (pin: string) => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  enableBiometric: () => Promise<{ ok: boolean; error?: string }>;
  disableBiometric: () => void;
  unlockWithBiometric: () => Promise<boolean>;
  lock: () => void;
};

const LockContext = createContext<LockContextValue | null>(null);
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

export function LockProvider({
  children,
  initialLocked = false,
}: {
  children: React.ReactNode;
  initialLocked?: boolean;
}) {
  const [settings, setSettings] = useState<LockSettings>(() => loadLockSettings());
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const router = useRouter();
  const lastActivityPing = useRef(0);
  const initialLockedRef = useRef(initialLocked);
  const didInitRef = useRef(false);

  const hasPin = hasPinConfigured(settings);
  const hasBiometric = Boolean(settings.biometricCredentialId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void fetch("/api/lock/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ enabled: hasPin }),
    }).finally(() => {
      if (!hasPin && initialLockedRef.current) {
        router.refresh();
      }
    });
  }, [hasPin, router]);

  const updateSettings = useCallback((updater: (prev: LockSettings) => LockSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveLockSettings(next);
      return next;
    });
  }, []);

  const setPin = useCallback(
    async (pin: string) => {
      const { hash, salt } = await createPinHash(pin);
      updateSettings((prev) => ({
        ...prev,
        pinHash: hash,
        pinSalt: salt,
      }));
    },
    [updateSettings],
  );

  const clearPin = useCallback(() => {
    updateSettings(() => ({}));
    setIsLocked(false);
    void fetch("/api/lock/unlock", { method: "POST" });
  }, [updateSettings]);

  const verifyPin = useCallback(
    async (pin: string) => {
      if (!hasPin || !settings.pinHash || !settings.pinSalt) return false;
      try {
        const hash = await hashPinWithSalt(pin, settings.pinSalt);
        return hash === settings.pinHash;
      } catch {
        return false;
      }
    },
    [hasPin, settings.pinHash, settings.pinSalt],
  );

  const unlockWithPin = useCallback(
    async (pin: string) => {
      const ok = await verifyPin(pin);
      if (ok) {
        try {
          const res = await fetch("/api/lock/unlock", { method: "POST" });
          if (res.ok) {
            const data = (await res.json()) as { locked?: boolean };
            setIsLocked(Boolean(data.locked));
          } else {
            setIsLocked(false);
          }
        } catch {
          setIsLocked(false);
        }
        router.refresh();
      }
      return ok;
    },
    [router, verifyPin],
  );

  const triggerHardLock = useCallback(() => {
    if (!hasPin) return;
    setIsLocked(true);
    void fetch("/api/lock/lock", { method: "POST" });
  }, [hasPin]);

  const lock = useCallback(() => {
    triggerHardLock();
  }, [triggerHardLock]);

  useHotkey("lockApp", () => {
    lock();
  });

  const enableBiometric = useCallback(async () => {
    try {
      const credentialId = await createBiometricCredential();
      updateSettings((prev) => ({
        ...prev,
        biometricCredentialId: credentialId,
      }));
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fingerprint setup failed.";
      return { ok: false, error: message };
    }
  }, [updateSettings]);

  const disableBiometric = useCallback(() => {
    updateSettings((prev) => ({
      ...prev,
      biometricCredentialId: undefined,
    }));
  }, [updateSettings]);

  const unlockWithBiometric = useCallback(async () => {
    if (!settings.biometricCredentialId) return false;
    const ok = await requestBiometricAssertion(settings.biometricCredentialId);
    if (ok) {
      try {
        const res = await fetch("/api/lock/unlock", { method: "POST" });
        if (res.ok) {
          const data = (await res.json()) as { locked?: boolean };
          setIsLocked(Boolean(data.locked));
        } else {
          setIsLocked(false);
        }
      } catch {
        setIsLocked(false);
      }
      router.refresh();
    }
    return ok;
  }, [router, settings.biometricCredentialId]);

  const handleServerState = useCallback(
    (locked: boolean) => {
      if (locked) {
        if (!isLocked) {
          triggerHardLock();
        } else {
          setIsLocked(true);
        }
      } else {
        setIsLocked(false);
      }
    },
    [isLocked, triggerHardLock],
  );

  useEffect(() => {
    let mounted = true;
    isPlatformAuthenticatorAvailable().then((available) => {
      if (mounted) setBiometricAvailable(available);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasPin) {
      setIsLocked(false);
      void fetch("/api/lock/unlock", { method: "POST" });
      didInitRef.current = true;
      return;
    }
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (!initialLockedRef.current) {
      triggerHardLock();
    }
  }, [hasPin, triggerHardLock]);

  useEffect(() => {
    if (!hasPin) return;
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/lock/state", { cache: "no-store" });
        if (!res.ok || !mounted) return;
        const data = (await res.json()) as { locked?: boolean };
        if (!mounted) return;
        if (typeof data.locked === "boolean") {
          handleServerState(data.locked);
        }
      } catch {
        /* ignore */
      }
    };
    const interval = window.setInterval(poll, LOCK_POLL_INTERVAL_MS);
    void poll();
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [hasPin, handleServerState]);

  useEffect(() => {
    if (!hasPin) return;
    const handleActivity = () => {
      if (isLocked) return;
      const now = Date.now();
      if (now - lastActivityPing.current < LOCK_ACTIVITY_THROTTLE_MS) return;
      lastActivityPing.current = now;
      void fetch("/api/lock/activity", { method: "POST" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || typeof data.locked !== "boolean") return;
          if (data.locked) {
            handleServerState(true);
          }
        })
        .catch(() => {
          /* ignore */
        });
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [hasPin, isLocked, handleServerState]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isLocked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLocked]);

  const value = useMemo<LockContextValue>(
    () => ({
      settings,
      isLocked,
      hasPin,
      hasBiometric,
      biometricAvailable,
      setPin,
      clearPin,
      verifyPin,
      unlockWithPin,
      enableBiometric,
      disableBiometric,
      unlockWithBiometric,
      lock,
    }),
    [
      settings,
      isLocked,
      hasPin,
      hasBiometric,
      biometricAvailable,
      setPin,
      clearPin,
      verifyPin,
      unlockWithPin,
      enableBiometric,
      disableBiometric,
      unlockWithBiometric,
      lock,
    ],
  );

  return (
    <LockContext.Provider value={value}>
      {children}
      <LockScreen
        isLocked={isLocked}
        hasPin={hasPin}
        hasBiometric={hasBiometric}
        biometricAvailable={biometricAvailable}
        unlockWithPin={unlockWithPin}
        unlockWithBiometric={unlockWithBiometric}
      />
    </LockContext.Provider>
  );
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error("useLock must be used within LockProvider");
  return ctx;
}

function hasPinConfigured(settings: LockSettings): boolean {
  return Boolean(settings.pinHash && settings.pinSalt);
}
