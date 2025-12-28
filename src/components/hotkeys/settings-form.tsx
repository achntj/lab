"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HotkeyAction, defaultHotkeys } from "@/config/hotkeys";
import { useHotkeyConfig } from "./hotkey-provider";

const labels: Record<HotkeyAction, string> = {
  commandPalette: "Command palette",
  quickSearch: "Search",
  newNote: "New note",
  newTask: "New task",
  toggleTheme: "Toggle theme",
  lockApp: "Lock app",
};

export function HotkeySettingsForm() {
  const { config, setHotkey } = useHotkeyConfig();
  const [drafts, setDrafts] = useState<Record<HotkeyAction, string>>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    (Object.keys(drafts) as HotkeyAction[]).forEach((action) => {
      setHotkey(action, drafts[action]);
    });
  };

  const handleReset = () => {
    setDrafts(defaultHotkeys);
    (Object.keys(defaultHotkeys) as HotkeyAction[]).forEach((action) =>
      setHotkey(action, defaultHotkeys[action]),
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(Object.keys(labels) as HotkeyAction[]).map((action) => (
        <div key={action} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full text-sm font-medium text-foreground sm:w-48">
            {labels[action]}
          </div>
          <Input
            value={drafts[action]}
            onChange={(e) =>
              setDrafts((prev) => ({
                ...prev,
                [action]: e.target.value,
              }))
            }
            className="w-full sm:w-40"
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="submit">Save hotkeys</Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset defaults
        </Button>
      </div>
    </form>
  );
}
