"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HotkeyAction, defaultHotkeys } from "@/config/hotkeys";
import { useHotkeyConfig } from "./hotkey-provider";

const labels: Record<HotkeyAction, string> = {
  commandPalette: "Command palette",
  search: "Search",
  quickSearch: "Quick search",
  newNote: "New note",
  newTask: "New task",
  toggleTheme: "Toggle theme",
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
        <div key={action} className="flex items-center gap-3">
          <div className="w-48 text-sm font-medium text-foreground">{labels[action]}</div>
          <Input
            value={drafts[action]}
            onChange={(e) =>
              setDrafts((prev) => ({
                ...prev,
                [action]: e.target.value,
              }))
            }
            className="w-40"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="submit">Save hotkeys</Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset defaults
        </Button>
      </div>
    </form>
  );
}
