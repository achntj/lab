"use client";

import { useEffect, useState } from "react";
import { Trash } from "lucide-react";

import { deleteTimer, toggleTimer } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TimerDto = {
  id: number;
  label: string;
  durationMinute: number;
  running: boolean;
  startedAt: string | Date | null;
  endsAt: string | Date | null;
};

function msRemaining(timer: TimerDto, now: number) {
  if (!timer.endsAt) return timer.running ? timer.durationMinute * 60 * 1000 : 0;
  const endsAt = typeof timer.endsAt === "string" ? new Date(timer.endsAt) : timer.endsAt;
  return Math.max(0, endsAt.getTime() - now);
}

export function TimerGrid({ timers }: { timers: TimerDto[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {timers.map((timer) => {
        const remainingMs = msRemaining(timer, now);
        const totalMs = timer.durationMinute * 60 * 1000;
        const percent = totalMs === 0 ? 0 : Math.min(100, (remainingMs / totalMs) * 100);
        const remainingMin = Math.floor(remainingMs / 1000 / 60);
        const remainingSec = Math.floor((remainingMs / 1000) % 60);
        const completed = timer.running && remainingMs === 0;
        const fillWidth = completed ? 100 : timer.running ? 100 - percent : 0;

        return (
          <div
            key={timer.id}
            className="relative flex flex-col gap-2 rounded-lg border bg-card/60 p-3 shadow-sm"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate font-semibold">{timer.label}</p>
              <Badge variant={timer.running ? "default" : "secondary"} className="shrink-0">
                {timer.durationMinute} min
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {completed
                ? "Completed"
                : timer.running
                  ? `Remaining: ${remainingMin}m ${remainingSec.toString().padStart(2, "0")}s`
                  : "Ready"}
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${fillWidth}%` }}
              />
            </div>
            <div className="flex items-center gap-2">
              <form action={toggleTimer}>
                <input type="hidden" name="timerId" value={timer.id} />
                <Button variant="secondary" size="sm" type="submit">
                  {timer.running ? "Stop" : "Start"}
                </Button>
              </form>
            </div>
            <form action={deleteTimer} className="absolute bottom-2 right-2">
              <input type="hidden" name="timerId" value={timer.id} />
              <Button variant="ghost" size="sm" className="text-destructive" aria-label="Delete timer">
                <Trash className="h-4 w-4" />
              </Button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
