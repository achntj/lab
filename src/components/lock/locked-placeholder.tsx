"use client";

export function LockedPlaceholder() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/30 p-8 text-sm text-muted-foreground">
      Locked. Enter your PIN to continue.
    </div>
  );
}
