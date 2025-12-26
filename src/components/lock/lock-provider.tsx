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
  initialVerified = true,
}: {
  children: React.ReactNode;
  initialLocked?: boolean;
  initialVerified?: boolean;
}) {
  const [settings, setSettings] = useState<LockSettings>(() => loadLockSettings());
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const router = useRouter();
  const lastActivityPing = useRef(0);
  const initialLockedRef = useRef(initialLocked);
  const didInitRef = useRef(false);
  // Guard against stale server responses overriding local lock transitions.
  const mutationRef = useRef(0);
  const pendingLockRef = useRef(false);
  const lastConfigSyncRef = useRef(0);

  const hasPin = hasPinConfigured(settings);
  const hasBiometric = Boolean(settings.biometricCredentialId);

  const syncLockConfig = useCallback(async (enabled: boolean) => {
    try {
      await fetch("/api/lock/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void syncLockConfig(hasPin).finally(() => {
      if (!hasPin && initialLockedRef.current) {
        router.refresh();
      }
    });
  }, [hasPin, router, syncLockConfig]);

  useEffect(() => {
    setIsVerified(initialVerified);
  }, [initialVerified]);

  const updateSettings = useCallback((updater: (prev: LockSettings) => LockSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      saveLockSettings(next);
      return next;
    });
  }, []);

  const bumpMutation = useCallback(() => {
    mutationRef.current += 1;
    return mutationRef.current;
  }, []);

  const setPin = useCallback(
    async (pin: string) => {
      const { hash, salt } = await createPinHash(pin);
      updateSettings((prev) => ({
        ...prev,
        pinHash: hash,
        pinSalt: salt,
      }));
      void fetch("/api/lock/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persist: true }),
      });
    },
    [updateSettings],
  );

  const clearPin = useCallback(() => {
    updateSettings(() => ({}));
    bumpMutation();
    pendingLockRef.current = false;
    setIsLocked(false);
    void fetch("/api/lock/unlock", { method: "POST" });
  }, [bumpMutation, updateSettings]);

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
        const mutationId = bumpMutation();
        pendingLockRef.current = false;
        try {
          const res = await fetch("/api/lock/unlock", { method: "POST" });
          if (res.ok) {
            const data = (await res.json()) as { locked?: boolean };
            if (mutationId === mutationRef.current) {
              setIsLocked(Boolean(data.locked));
            }
          } else {
            if (mutationId === mutationRef.current) {
              setIsLocked(false);
            }
          }
        } catch {
          if (mutationId === mutationRef.current) {
            setIsLocked(false);
          }
        }
        router.refresh();
      }
      return ok;
    },
    [bumpMutation, router, verifyPin],
  );

  const unlockWithoutPin = useCallback(() => {
    bumpMutation();
    pendingLockRef.current = false;
    setIsLocked(false);
    void fetch("/api/lock/unlock", { method: "POST" });
  }, [bumpMutation]);

  const lock = useCallback(() => {
    if (!hasPin) return;
    const mutationId = bumpMutation();
    pendingLockRef.current = true;
    setIsLocked(true);
    void (async () => {
      await syncLockConfig(true);
      try {
        const res = await fetch("/api/lock/lock", { method: "POST" });
        if (!res.ok) return;
        const data = (await res.json()) as { locked?: boolean };
        if (mutationId !== mutationRef.current) return;
        if (typeof data.locked === "boolean") {
          pendingLockRef.current = false;
          setIsLocked(Boolean(data.locked));
        }
      } catch {
        /* ignore */
      }
    })();
  }, [bumpMutation, hasPin, syncLockConfig]);

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
      const mutationId = bumpMutation();
      pendingLockRef.current = false;
      try {
        const res = await fetch("/api/lock/unlock", { method: "POST" });
        if (res.ok) {
          const data = (await res.json()) as { locked?: boolean };
          if (mutationId === mutationRef.current) {
            setIsLocked(Boolean(data.locked));
          }
        } else {
          if (mutationId === mutationRef.current) {
            setIsLocked(false);
          }
        }
      } catch {
        if (mutationId === mutationRef.current) {
          setIsLocked(false);
        }
      }
      router.refresh();
    }
    return ok;
  }, [bumpMutation, router, settings.biometricCredentialId]);

  const handleServerState = useCallback(
    (locked: boolean) => {
      if (locked) {
        pendingLockRef.current = false;
        setIsLocked(true);
        return;
      }
      if (pendingLockRef.current) return;
      setIsLocked(false);
    },
    [],
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      unlockWithoutPin();
      didInitRef.current = true;
      return;
    }
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (!initialLockedRef.current) {
      lock();
    }
  }, [hasPin, lock, unlockWithoutPin]);

  useEffect(() => {
    if (!hasPin) return;
    let mounted = true;
    const poll = async () => {
      const mutationId = mutationRef.current;
      try {
        const res = await fetch("/api/lock/state", { cache: "no-store" });
        if (!res.ok || !mounted) return;
        const data = (await res.json()) as { locked?: boolean; enabled?: boolean };
        if (!mounted) return;
        if (mutationId !== mutationRef.current) return;
        if (data.enabled === false && hasPin) {
          const now = Date.now();
          if (now - lastConfigSyncRef.current > LOCK_POLL_INTERVAL_MS) {
            lastConfigSyncRef.current = now;
            void syncLockConfig(true);
          }
          return;
        }
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
  }, [hasPin, handleServerState, syncLockConfig]);

  useEffect(() => {
    if (!hasPin) return;
    const handleActivity = () => {
      if (isLocked) return;
      const now = Date.now();
      if (now - lastActivityPing.current < LOCK_ACTIVITY_THROTTLE_MS) return;
      lastActivityPing.current = now;
      const mutationId = mutationRef.current;
      void fetch("/api/lock/activity", { method: "POST" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data || typeof data.locked !== "boolean") return;
          if (mutationId !== mutationRef.current) return;
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
        isVerified={isVerified}
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
