import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

export default async function CalendarPage() {
  const [events, tasks] = await Promise.all([
    prisma.event.findMany({ orderBy: { date: "asc" } }),
    prisma.task.findMany({
      where: { dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Upcoming events and time-sensitive tasks."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Events</CardTitle>
            <CardDescription>Seeded schedule for the week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-1 rounded-lg border bg-card/60 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{event.title}</p>
                  <Badge variant="outline">Event</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(event.date)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
                {event.description ? (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Due soon</CardTitle>
            <CardDescription>Tasks with dates attached.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {task.dueDate ? formatDateTime(task.dueDate) : "No due date"}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {task.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
