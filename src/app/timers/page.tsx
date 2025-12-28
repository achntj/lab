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
          <form
            action={createTimer}
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
          >
            <Input name="label" placeholder="New timer" required className="w-full sm:w-40" />
            <Input
              name="durationMinute"
              type="number"
              min={1}
              step={1}
              placeholder="Minutes"
              className="w-full sm:w-28"
              required
            />
            <Button type="submit" size="sm" className="w-full sm:w-auto">
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
