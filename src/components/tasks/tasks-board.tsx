"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { deleteTask, updateTask } from "@/app/actions";
import { TasksFilterControls } from "@/components/tasks/filter-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, toDateTimeLocal } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type TaskItem = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  notes: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  "in-progress": "In progress",
  blocked: "Blocked",
  done: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  normal: "Normal",
  low: "Low",
};

const statusBadgeStyles = (status: string) =>
  cn(
    "capitalize",
    status === "in-progress" && "bg-primary text-primary-foreground",
    status === "blocked" && "bg-destructive text-destructive-foreground",
    status === "todo" && "bg-muted text-muted-foreground",
    status === "done" && "bg-secondary text-secondary-foreground",
  );

const priorityBadgeStyles = (priority: string) =>
  cn(
    "capitalize",
    priority === "high" && "border-destructive/40 text-destructive",
    priority === "normal" && "border-muted-foreground/30 text-muted-foreground",
    priority === "low" && "border-muted-foreground/20 text-muted-foreground",
  );

const formatDate = (date?: string | null) => formatDateTime(date) || "No due date";

const getDueMeta = (dueDate: string | null, status: string) => {
  if (!dueDate) {
    return { label: "No due date", tone: "text-muted-foreground", overdue: false };
  }
  const dueAt = new Date(dueDate);
  if (Number.isNaN(dueAt.getTime())) {
    return { label: "No due date", tone: "text-muted-foreground", overdue: false };
  }
  const now = new Date();
  const overdue = status !== "done" && dueAt.getTime() < now.getTime();
  return {
    label: formatDate(dueDate),
    tone: overdue ? "text-destructive" : "text-muted-foreground",
    overdue,
  };
};

type TasksBoardProps = {
  tasks: TaskItem[];
};

export function TasksBoard({ tasks }: TasksBoardProps) {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status")?.trim() ?? "";
  const statusFilter = STATUS_LABELS[statusParam] ? statusParam : "all";

  const totals = useMemo(
    () =>
      tasks.reduce<Record<string, number>>((acc, task) => {
        acc[task.status] = (acc[task.status] ?? 0) + 1;
        return acc;
      }, {}),
    [tasks],
  );

  const filteredTasks = useMemo(
    () => (statusFilter !== "all" ? tasks.filter((task) => task.status === statusFilter) : tasks),
    [tasks, statusFilter],
  );

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>
              {statusFilter === "all"
                ? "All tasks sorted by newest."
                : `Filtered to ${STATUS_LABELS[statusFilter] ?? statusFilter}.`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Filter</span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/50" aria-hidden="true" />
            <span>Click a status to refine</span>
          </div>
        </div>
        <TasksFilterControls current={statusFilter} totals={totals} />
      </CardHeader>
      <CardContent className="p-0">
        {filteredTasks.length ? (
          <div className="divide-y">
            {filteredTasks.map((task) => {
              const due = getDueMeta(task.dueDate, task.status);
              const dueLabel = due.overdue
                ? `Overdue: ${due.label}`
                : due.label === "No due date"
                  ? "No due date"
                  : `Due: ${due.label}`;

              return (
                <Dialog key={task.id}>
                  <DialogTrigger asChild>
                    <button className="flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-muted/20">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <p className="break-all text-sm font-semibold text-foreground">
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className={cn("font-medium", due.tone)}>{dueLabel}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusBadgeStyles(task.status)}>
                            {STATUS_LABELS[task.status] ?? task.status}
                          </Badge>
                          <Badge variant="outline" className={priorityBadgeStyles(task.priority)}>
                            {PRIORITY_LABELS[task.priority] ?? task.priority}
                          </Badge>
                        </div>
                      </div>
                      {task.notes ? (
                        <p className="line-clamp-2 break-all text-xs text-muted-foreground">
                          {task.notes}
                        </p>
                      ) : null}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader className="space-y-2">
                      <DialogTitle>Edit task</DialogTitle>
                      <CardDescription>Update status, priority, due date, or add extra notes.</CardDescription>
                    </DialogHeader>
                    <form action={updateTask} className="grid gap-4">
                      <input type="hidden" name="taskId" value={task.id} />
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Title
                        </label>
                        <Input name="title" defaultValue={task.title} required />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Status
                          </label>
                          <select
                            name="status"
                            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                            defaultValue={task.status}
                          >
                            <option value="todo">Todo</option>
                            <option value="in-progress">In progress</option>
                            <option value="blocked">Blocked</option>
                            <option value="done">Done</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Priority
                          </label>
                          <select
                            name="priority"
                            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                            defaultValue={task.priority}
                          >
                            <option value="high">High</option>
                            <option value="normal">Normal</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Due date
                        </label>
                        <Input
                          name="dueDate"
                          type="datetime-local"
                          step="60"
                          defaultValue={toDateTimeLocal(task.dueDate)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Notes
                        </label>
                        <Textarea
                          name="notes"
                          placeholder="Notes (optional)"
                          rows={4}
                          defaultValue={task.notes ?? ""}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <DialogClose asChild>
                          <Button type="button" variant="ghost">
                            Cancel
                          </Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button type="submit">Save changes</Button>
                        </DialogClose>
                      </div>
                    </form>
                    <form action={deleteTask} className="border-t pt-3">
                      <input type="hidden" name="taskId" value={task.id} />
                      <Button type="submit" variant="ghost" className="text-destructive">
                        Delete task
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No tasks found</p>
            <p className="text-xs text-muted-foreground">
              {statusFilter === "all"
                ? "Create your first task to start tracking work."
                : "Try a different status filter or reset to see everything."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
