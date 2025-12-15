import Link from "next/link";

import { createTask, deleteTask, updateTask } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, toDateTimeLocal } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { TasksFilterControls } from "@/components/tasks/filter-controls";

export const dynamic = "force-dynamic";

const formatDate = (date?: Date | null) => formatDateTime(date) || "No due date";

type TasksPageProps = {
  searchParams?: { status?: string };
};

function TaskCreateDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="text-lg leading-none">+</span>
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form action={createTask} className="grid gap-3">
          <Input name="title" placeholder="Title" required />
          <div className="grid grid-cols-2 gap-3">
            <select
              name="priority"
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              defaultValue="normal"
            >
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
            <select
              name="status"
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              defaultValue="todo"
            >
              <option value="todo">Todo</option>
              <option value="in-progress">In progress</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <Input
            name="dueDate"
            type="datetime-local"
            step="60"
            placeholder="Due date & time (reminds at this time)"
          />
          <Textarea name="notes" placeholder="Notes (optional)" />
          <DialogClose asChild>
            <Button type="submit">Create task</Button>
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const statusFilter = searchParams?.status;
  const where =
    statusFilter && statusFilter !== "all" ? { status: statusFilter } : undefined;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const totals = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage tasks with status, priority, and optional due dates."
        actions={<TaskCreateDialog />}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card/60 px-3 py-2">
        <TasksFilterControls current={statusFilter} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {["todo", "in-progress", "blocked", "done"].map((status) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardDescription className="capitalize">{status}</CardDescription>
              <CardTitle className="text-2xl">{totals[status] ?? 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {status === "todo" && "Ready to pick up next"}
                {status === "in-progress" && "Currently moving"}
                {status === "blocked" && "Waiting on unblocks"}
                {status === "done" && "Wrapped up"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All tasks</CardTitle>
          <CardDescription>Seeded demo rows for local testing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.map((task) => (
            <Dialog key={task.id}>
              <DialogTrigger asChild>
                <button className="flex w-full flex-col gap-2 rounded-lg border bg-card/60 px-3 py-3 text-left transition hover:border-primary/40 hover:bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{task.title}</p>
                    <Badge
                      className={cn(
                        "capitalize",
                        task.status === "in-progress" && "bg-primary text-primary-foreground",
                        task.status === "blocked" && "bg-destructive text-destructive-foreground",
                        task.status === "todo" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {task.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Priority: {task.priority} · {formatDate(task.dueDate)}
                  </p>
                  {task.notes ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{task.notes}</p>
                  ) : null}
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit task</DialogTitle>
                </DialogHeader>
                <form action={updateTask} className="grid gap-3">
                  <input type="hidden" name="taskId" value={task.id} />
                  <Input name="title" defaultValue={task.title} required />
                  <div className="grid grid-cols-2 gap-3">
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
                  <Input
                    name="dueDate"
                    type="datetime-local"
                    step="60"
                    defaultValue={toDateTimeLocal(task.dueDate)}
                  />
                  <Textarea name="notes" placeholder="Notes (optional)" defaultValue={task.notes ?? ""} />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <DialogClose asChild>
                      <Button type="submit">Save changes</Button>
                    </DialogClose>
                  </div>
                </form>
                <form action={deleteTask}>
                  <input type="hidden" name="taskId" value={task.id} />
                  <Button type="submit" variant="ghost" className="text-destructive">
                    Delete task
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
