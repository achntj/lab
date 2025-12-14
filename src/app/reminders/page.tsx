import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatRelativeTime } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

export default async function RemindersPage() {
  const reminders = await prisma.reminder.findMany({
    where: { delivered: false },
    orderBy: { triggerAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        description="Everything queued to alert you, shown in your local time."
      />

      <Card>
        <CardHeader>
          <CardTitle>Queued reminders</CardTitle>
          <CardDescription>
            These fire automatically while the workspace is open, exactly at their trigger time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders are scheduled.</p>
          ) : (
            reminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex flex-col gap-1 rounded-lg border bg-card/60 px-3 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {reminder.kind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Source: {reminder.source} · #{reminder.sourceId}
                    </span>
                  </div>
                  <p className="font-medium">{reminder.title}</p>
                  <p className="text-sm text-muted-foreground">{reminder.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Fires {formatDateTime(reminder.triggerAt)} ({formatRelativeTime(reminder.triggerAt)})
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground sm:pt-1">
                  ID {reminder.id}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
