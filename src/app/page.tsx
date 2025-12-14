import Link from "next/link";

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
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="bg-card/80">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

function formatDate(value?: Date | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    value,
  );
}

function linkLabel(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const NOW = Date.now();

export default async function HomePage() {
  const [tasks, notes, subscriptions, bookmarks] = await Promise.all([
    prisma.task.findMany({ orderBy: { dueDate: "asc" }, take: 4 }),
    prisma.note.findMany({ orderBy: { updatedAt: "desc" }, take: 3 }),
    prisma.subscription.findMany({ orderBy: { renewalDate: "asc" }, take: 4 }),
    prisma.bookmark.findMany({ take: 3, orderBy: { createdAt: "desc" } }),
  ]);

  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const dueSoon = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const diff = task.dueDate.getTime() - NOW;
    return diff <= 1000 * 60 * 60 * 24 * 3 && diff >= 0;
  }).length;

  const upcomingRenewal = subscriptions[0];
  const monthlySpend = subscriptions
    .filter((sub) => sub.cadence === "monthly")
    .reduce((acc, sub) => acc + Number(sub.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of tasks, notes, finances, and upcoming items."
        actions={
          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/tasks">Go to Tasks</Link>
            </Button>
            <Button asChild>
              <Link href="/notes">New note</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Open tasks" value={openTasks} hint={`${dueSoon} due soon`} />
        <StatCard
          title="Subscriptions"
          value={`$${monthlySpend.toFixed(2)}/mo`}
          hint={
            upcomingRenewal
              ? `Next: ${upcomingRenewal.name} on ${formatDate(upcomingRenewal.renewalDate)}`
              : "No renewals"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>Latest priorities.</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/tasks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {task.priority} · {formatDate(task.dueDate)}
                  </p>
                </div>
                <Badge
                  className={cn(
                    task.status === "done"
                      ? "bg-secondary text-secondary-foreground"
                      : task.status === "in-progress"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {task.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Notes</CardTitle>
              <CardDescription>Capture insights.</CardDescription>
            </div>
            <Badge variant="secondary">{notes.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border bg-muted/30 p-3">
                <p className="font-medium">{note.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {note.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>Next renewals</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/finances">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{sub.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Renews {formatDate(sub.renewalDate)} · card {sub.cardName}
                  </p>
                </div>
                <Badge variant="secondary">${Number(sub.amount).toFixed(2)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Bookmarks</CardTitle>
              <CardDescription>Recent links</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/bookmarks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {bookmarks.map((bm) => {
              const label = linkLabel(bm.url);
              return (
                <div
                  key={bm.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{bm.url}</p>
                  </div>
                  {bm.category ? (
                    <Badge variant="secondary">{bm.category}</Badge>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
