import { SubscriptionBoard } from "@/components/finances/subscription-board";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDayOfMonth, toTimeLocal } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

export default async function FinancesPage() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: { renewalDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="View subscriptions with renewal dates, cards, and reminders."
      />
      <SubscriptionBoard subscriptions={subscriptions} />

      <Card>
        <CardHeader>
          <CardTitle>Upcoming renewals</CardTitle>
          <CardDescription>Timeline by next renewal date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptions
            .slice()
            .sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime())
            .map((sub) => (
              <div key={sub.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <div className="absolute left-[5px] top-3 h-10 w-px bg-border last:hidden" />
                </div>
                <div className="flex flex-1 items-center justify-between rounded-lg border bg-card/60 px-3 py-2">
                  <div>
                    <p className="font-semibold">{sub.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Every {formatDayOfMonth(sub.renewalDate.getDate())} at{" "}
                      {toTimeLocal(sub.renewalDate)} (next {formatDateTime(sub.renewalDate)}) · remind{" "}
                      {sub.reminderDays} days before
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
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
