"use client";

import { Lock } from "lucide-react";

import { useLock } from "@/components/lock/lock-provider";
import { Button } from "@/components/ui/button";

export function LockButton() {
  const { hasPin, isLocked, lock } = useLock();

  if (!hasPin) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={lock}
      disabled={isLocked}
      aria-label="Lock"
      title="Lock (Command+Shift+L)"
    >
      <Lock className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}
