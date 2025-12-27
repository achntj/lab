"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  current?: string;
  totals?: Record<string, number>;
};

const STATUSES = [
  { value: "all", label: "All" },
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export function TasksFilterControls({ current, totals }: Props) {
  const router = useRouter();
  const status = current ?? "all";
  const [isPending, startTransition] = useTransition();

  const apply = (next: string) => {
    startTransition(() => {
      const qs = next && next !== "all" ? `?status=${encodeURIComponent(next)}` : "";
      router.replace(`/tasks${qs}`);
      router.refresh();
    });
  };

  const reset = () => {
    apply("all");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.map((item) => {
        const count =
          item.value === "all"
            ? Object.values(totals ?? {}).reduce((sum, value) => sum + value, 0)
            : totals?.[item.value] ?? 0;
        const isActive = status === item.value;

        return (
          <Button
            key={item.value}
            type="button"
            size="sm"
            variant={isActive ? "secondary" : "ghost"}
            className={cn("gap-2", isActive && "text-foreground")}
            onClick={() => apply(item.value)}
            disabled={isPending}
            aria-pressed={isActive}
          >
            <span>{item.label}</span>
            <Badge variant="outline" className="text-[10px] font-semibold">
              {count}
            </Badge>
          </Button>
        );
      })}
      <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isPending}>
        Reset
      </Button>
    </div>
  );
}
