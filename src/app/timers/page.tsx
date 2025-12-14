import { createTimer } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TimerGrid } from "@/components/timers/timer-grid";
import { prisma } from "@/lib/prisma";

export default async function TimersPage() {
  const timers = await prisma.timer.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timers"
        description="Preset timers for work blocks."
        actions={
          <form action={createTimer} className="flex items-center gap-2">
            <Input name="label" placeholder="New timer" required className="w-40" />
            <Input
              name="durationMinute"
              type="number"
              min={1}
              step={1}
              placeholder="Minutes"
              className="w-28"
              required
            />
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Presets</CardTitle>
          <CardDescription>Common durations.</CardDescription>
        </CardHeader>
        <CardContent>
          <TimerGrid timers={timers} />
        </CardContent>
      </Card>
    </div>
  );
}
