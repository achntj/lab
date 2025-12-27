import { createTask } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
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
import { prisma } from "@/lib/prisma";
import { TasksBoard } from "@/components/tasks/tasks-board";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  "in-progress": "In progress",
  blocked: "Blocked",
  done: "Done",
};

type TasksPageProps = {
  searchParams?: { status?: string | string[] };
};

function TaskCreateDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <span className="text-lg leading-none">+</span>
          New task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle>New task</DialogTitle>
          <CardDescription>Capture the work, set a priority, and add a due date if needed.</CardDescription>
        </DialogHeader>
        <form action={createTask} className="grid gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Title
            </label>
            <Input name="title" placeholder="Write a clear, action-focused title" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Priority
              </label>
              <select
                name="priority"
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                defaultValue="normal"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </label>
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
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Due date
            </label>
            <Input
              name="dueDate"
              type="datetime-local"
              step="60"
              placeholder="Due date & time (reminds at this time)"
            />
            <p className="text-xs text-muted-foreground">Optional, reminder fires at this time.</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </label>
            <Textarea name="notes" placeholder="Add extra context, links, or blockers." rows={4} />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button type="submit">Create task</Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default async function TasksPage(_props: TasksPageProps) {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
  const totals = tasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalCount = tasks.length;

  const tasksData = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    notes: task.notes,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage tasks with status, priority, and optional due dates."
        actions={<TaskCreateDialog />}
      />

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Overview</CardTitle>
              <CardDescription>See what needs attention and how work is flowing.</CardDescription>
            </div>
            <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {totalCount} total
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["todo", "in-progress", "blocked", "done"].map((status) => (
              <div key={status} className="rounded-lg border bg-card/60 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {STATUS_LABELS[status]}
                </p>
                <p className="text-2xl font-semibold text-foreground">{totals[status] ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {status === "todo" && "Ready to pick up next"}
                  {status === "in-progress" && "Currently moving"}
                  {status === "blocked" && "Waiting on unblocks"}
                  {status === "done" && "Wrapped up"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TasksBoard tasks={tasksData} />
    </div>
  );
}
