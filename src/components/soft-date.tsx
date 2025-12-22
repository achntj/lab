"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type SoftDateProps = {
  className?: string;
};

type DateParts = {
  weekday: string;
  day: string;
};

export function SoftDate({ className }: SoftDateProps) {
  const [parts, setParts] = useState<DateParts | null>(null);

  useEffect(() => {
    const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });
    const dayFormatter = new Intl.DateTimeFormat("en", { day: "2-digit" });
    let timeoutId: number | undefined;

    const update = () => {
      const now = new Date();
      setParts({
        weekday: weekdayFormatter.format(now),
        day: dayFormatter.format(now),
      });

      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      timeoutId = window.setTimeout(update, nextMidnight.getTime() - now.getTime());
    };

    update();

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!parts) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground/80 opacity-0",
          className,
        )}
        aria-hidden
      >
        <span className="uppercase tracking-[0.25em]">Wed</span>
        <span className="font-mono text-sm text-foreground/70 tabular-nums">88</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground/80", className)}>
      <span className="uppercase tracking-[0.25em]">{parts.weekday}</span>
      <span className="font-mono text-sm text-foreground/70 tabular-nums">{parts.day}</span>
    </div>
  );
}
