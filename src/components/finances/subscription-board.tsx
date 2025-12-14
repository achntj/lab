"use client";

import { useState } from "react";

import {
  createSubscription,
  deleteSubscription,
  updateSubscription,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/components/notifications/notification-provider";
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
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Subscription = {
  id: number;
  name: string;
  amount: number;
  renewalDate: Date | string;
  cardName: string;
  reminderDays: number;
  cadence: string;
  note: string | null;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDate = (value: Date) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(value);

export function SubscriptionBoard({ subscriptions }: { subscriptions: Subscription[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const { notify } = useNotifications();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Active</h2>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button>Add subscription</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New subscription</DialogTitle>
            </DialogHeader>
            <form action={createSubscription} className="grid gap-3">
              <Input name="name" placeholder="Service name" required />
              <Input name="amount" type="number" step="0.01" min="0" placeholder="Amount" required />
              <Input name="renewalDate" type="date" required />
              <Input name="cardName" placeholder="Card name" required />
              <Input name="cadence" placeholder="Cadence (monthly)" defaultValue="monthly" />
              <Input
                name="reminderDays"
                type="number"
                min="0"
                placeholder="Reminder days"
                defaultValue="3"
              />
              <Input name="note" placeholder="Notes (optional)" />
              <DialogClose asChild>
                <Button type="submit">Save</Button>
              </DialogClose>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {subscriptions.map((sub) => {
          const renewal = new Date(sub.renewalDate);
          return (
            <Card key={sub.id} className="flex flex-col">
              <CardHeader className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>{sub.name}</CardTitle>
                  <CardDescription>
                    Renews {formatDate(renewal)} · {currency(Number(sub.amount))}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground">Card: {sub.cardName}</p>
                </div>
                <Badge variant="secondary">{sub.cadence}</Badge>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Reminder {sub.reminderDays} day(s) before renewal
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      notify({
                        title: "Subscription reminder",
                        message: `${sub.name} renews ${formatDate(renewal)} · ${currency(
                          Number(sub.amount),
                        )}`,
                      })
                    }
                  >
                    Remind
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setOpenId(sub.id)}>
                    Manage
                  </Button>
                </div>
              </CardContent>
              <Dialog
                open={openId === sub.id}
                onOpenChange={(open) => setOpenId(open ? sub.id : null)}
              >
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Update {sub.name}</DialogTitle>
                  </DialogHeader>
                  <form action={updateSubscription} className="grid gap-2">
                    <input type="hidden" name="subscriptionId" value={sub.id} />
                    <Input name="name" defaultValue={sub.name} required />
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={sub.amount}
                      required
                    />
                    <Input
                      name="renewalDate"
                      type="date"
                      defaultValue={renewal.toISOString().slice(0, 10)}
                      required
                    />
                    <Input name="cardName" defaultValue={sub.cardName} required />
                    <Input name="cadence" defaultValue={sub.cadence} />
                    <Input
                      name="reminderDays"
                      type="number"
                      min="0"
                      defaultValue={sub.reminderDays}
                      required
                    />
                    <Input name="note" defaultValue={sub.note ?? ""} placeholder="Notes (optional)" />
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <DialogClose asChild>
                        <Button type="submit">Save changes</Button>
                      </DialogClose>
                    </div>
                  </form>
                  <form action={deleteSubscription} className="pt-2">
                    <input type="hidden" name="subscriptionId" value={sub.id} />
                    <Button type="submit" variant="ghost" className="text-destructive">
                      Delete
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
