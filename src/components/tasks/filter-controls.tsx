"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type Props = {
  current?: string;
};

export function TasksFilterControls({ current }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(current ?? "all");
  const [isPending, startTransition] = useTransition();

  const apply = () => {
    startTransition(() => {
      const qs = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
      router.replace(`/tasks${qs}`);
    });
  };

  const reset = () => {
    setStatus("all");
    startTransition(() => {
      router.replace("/tasks");
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="flex items-center gap-2"
    >
      <select
        name="status"
        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="all">All</option>
        <option value="todo">Todo</option>
        <option value="in-progress">In progress</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
      </select>
      <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
        {isPending ? "Filtering..." : "Filter"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isPending}>
        Reset
      </Button>
    </form>
  );
}
