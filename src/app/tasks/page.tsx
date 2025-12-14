import Link from "next/link";

import { createTask, updateTaskStatus } from "@/app/actions";
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
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const formatDate = (date?: Date | null) =>
  date
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
      }).format(date)
    : "No due date";

type TasksPageProps = {
  searchParams?: { status?: string };
};

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
        description="Track open work, due dates, and priority at a glance."
        actions={
          <div className="flex items-center gap-2">
            <form action={createTask} className="flex items-center gap-2">
              <Input
                name="title"
                placeholder="New task title"
                required
                className="w-48"
              />
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
              <Input name="dueDate" type="date" className="w-40" />
              <Button type="submit" size="sm">
                Add
              </Button>
            </form>
            <form
              method="get"
              className="flex items-center gap-2 rounded-lg border bg-card/60 px-3 py-2"
            >
              <select
                name="status"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                defaultValue={statusFilter ?? "all"}
              >
                <option value="all">All</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
              </select>
              <Button type="submit" size="sm" variant="secondary">
                Filter
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/tasks">Reset</Link>
              </Button>
            </form>
          </div>
        }
      />

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
            <div
              key={task.id}
              className="flex flex-col gap-2 rounded-lg border bg-card/60 px-3 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">
                  Priority: {task.priority} · {formatDate(task.dueDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                <form action={updateTaskStatus} className="flex items-center gap-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <select
                    name="status"
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    defaultValue={task.status}
                  >
                    <option value="todo">Todo</option>
                    <option value="in-progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    Update
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
