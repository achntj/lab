import { SubscriptionBoard } from "@/components/finances/subscription-board";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, toTimeLocal } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

export default async function FinancesPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { renewalDate: "asc" },
  });
  const now = new Date();
  const getNextPayment = (sub: (typeof subscriptions)[number]) => {
    if (!sub.startDate) return sub.renewalDate;
    const [hour = 0, minute = 0] = (toTimeLocal(sub.renewalDate) || "00:00")
      .split(":")
      .map((part) => Number(part));
    const startBoundary = new Date(
      sub.startDate.getFullYear(),
      sub.startDate.getMonth(),
      sub.startDate.getDate(),
      Number.isNaN(hour) ? 0 : hour,
      Number.isNaN(minute) ? 0 : minute,
      0,
      0,
    );
    return startBoundary > now ? startBoundary : sub.renewalDate;
  };
  const activeSubscriptions = subscriptions.filter((sub) => !sub.paused);
  const scheduledSubscriptions = activeSubscriptions.filter(
    (sub) => sub.startDate && sub.startDate > now,
  );
  const startedSubscriptions = activeSubscriptions.filter(
    (sub) => !sub.startDate || sub.startDate <= now,
  );
  const pausedSubscriptions = subscriptions.filter((sub) => sub.paused);
  const monthlySpend = startedSubscriptions
    .filter((sub) => sub.cadence === "monthly")
    .reduce((acc, sub) => acc + Number(sub.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Track current, scheduled, and paused subscriptions with start dates, cards, and reminders."
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current subscriptions</CardDescription>
            <CardTitle className="text-3xl">{startedSubscriptions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Scheduled subscriptions</CardDescription>
            <CardTitle className="text-3xl">{scheduledSubscriptions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paused subscriptions</CardDescription>
            <CardTitle className="text-3xl">{pausedSubscriptions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly spend</CardDescription>
            <CardTitle className="text-3xl">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(monthlySpend)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <SubscriptionBoard subscriptions={subscriptions} />

      <Card>
        <CardHeader>
          <CardTitle>Upcoming payments</CardTitle>
          <CardDescription>Timeline by next payment date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {startedSubscriptions.length ? (
            startedSubscriptions
              .slice()
              .sort((a, b) => getNextPayment(a).getTime() - getNextPayment(b).getTime())
              .map((sub) => {
                const nextPayment = getNextPayment(sub);
                return (
                  <div key={sub.id} className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <div className="absolute left-[5px] top-3 h-10 w-px bg-border last:hidden" />
                    </div>
                    <div className="flex flex-1 items-center justify-between rounded-lg border bg-card/60 px-3 py-2">
                      <div>
                        <p className="font-semibold">{sub.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Next payment {formatDateTime(nextPayment)} · remind {sub.reminderDays}{" "}
                          days before
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(Number(sub.amount))}
                      </span>
                    </div>
                  </div>
                );
              })
          ) : (
            <p className="text-sm text-muted-foreground">
              No upcoming payments for current subscriptions.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
