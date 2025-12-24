"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { defaultHotkeys, type HotkeyAction } from "@/config/hotkeys";

type HotkeyContextValue = {
  config: Record<HotkeyAction, string>;
  setHotkey: (action: HotkeyAction, combo: string) => void;
};

const STORAGE_KEY = "personal-lab-hotkeys";

const HotkeyContext = createContext<HotkeyContextValue | null>(null);

export function HotkeyProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Record<HotkeyAction, string>>(() => {
    if (typeof window === "undefined") return defaultHotkeys;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<Record<HotkeyAction, string>>;
        const next = { ...defaultHotkeys, ...parsed };
        let didMigrate = false;
        if (!parsed.lockApp && parsed.toggleTheme === "mod+shift+l") {
          next.toggleTheme = defaultHotkeys.toggleTheme;
          didMigrate = true;
        }
        if (didMigrate) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        return next;
      } catch {
        return defaultHotkeys;
      }
    }
    return defaultHotkeys;
  });

  const setHotkey = (action: HotkeyAction, combo: string) => {
    setConfig((prev) => {
      const next = { ...prev, [action]: combo };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(() => ({ config, setHotkey }), [config]);

  return <HotkeyContext.Provider value={value}>{children}</HotkeyContext.Provider>;
}

export function useHotkey(
  action: HotkeyAction,
  handler: (event: KeyboardEvent) => void,
) {
  const ctx = useContext(HotkeyContext);
  if (!ctx) {
    throw new Error("useHotkey must be used within HotkeyProvider");
  }

  useEffect(() => {
    const combo = ctx.config[action] ?? "";
    if (!combo) return;
    const parts = combo.toLowerCase().split("+").map((p) => p.trim());

    const listener = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      const neededMod = parts.includes("mod");
      const neededShift = parts.includes("shift");
      const keyPart = parts.find((p) => p !== "mod" && p !== "shift");
      if (neededMod && !isMod) return;
      if (!neededMod && isMod) return;
      if (neededShift !== event.shiftKey) return;
      if (keyPart && event.key.toLowerCase() !== keyPart) return;
      event.preventDefault();
      handler(event);
    };

    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [ctx.config, action, handler]);

  return ctx;
}

export function useHotkeyConfig() {
  const ctx = useContext(HotkeyContext);
  if (!ctx) throw new Error("useHotkeyConfig must be used within HotkeyProvider");
  return ctx;
}
