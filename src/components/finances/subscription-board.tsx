"use client";

import { useState } from "react";

import {
  createSubscription,
  deleteSubscription,
  setSubscriptionPause,
  updateSubscription,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, toTimeLocal } from "@/lib/datetime";

type Subscription = {
  id: number;
  name: string;
  amount: number;
  renewalDate: Date | string;
  cardName: string;
  reminderDays: number;
  cadence: string;
  startDate: Date | string | null;
  paused: boolean;
  note: string | null;
};

const currency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const pad = (value: number) => value.toString().padStart(2, "0");
const toDateInput = (value?: Date | string | null) => {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export function SubscriptionBoard({ subscriptions }: { subscriptions: Subscription[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const now = Date.now();
  const activeSubscriptions = subscriptions.filter((sub) => !sub.paused);
  const pausedSubscriptions = subscriptions.filter((sub) => sub.paused);
  const getNextPayment = (sub: Subscription) => {
    if (!sub.startDate) return new Date(sub.renewalDate);
    const renewalTime = toTimeLocal(sub.renewalDate);
    const [hour = 0, minute = 0] = (renewalTime || "00:00")
      .split(":")
      .map((part) => Number(part));
    const startDateValue = new Date(sub.startDate);
    const startBoundary = new Date(
      startDateValue.getFullYear(),
      startDateValue.getMonth(),
      startDateValue.getDate(),
      Number.isNaN(hour) ? 0 : hour,
      Number.isNaN(minute) ? 0 : minute,
      0,
      0,
    );
    return startBoundary.getTime() > now ? startBoundary : new Date(sub.renewalDate);
  };
  const currentSubscriptions = activeSubscriptions.filter((sub) => {
    if (!sub.startDate) return true;
    const start = new Date(sub.startDate);
    return !Number.isNaN(start.getTime()) && start.getTime() <= now;
  });
  const scheduledSubscriptions = activeSubscriptions.filter((sub) => {
    if (!sub.startDate) return false;
    const start = new Date(sub.startDate);
    return !Number.isNaN(start.getTime()) && start.getTime() > now;
  });

  const renderSubscription = (sub: Subscription) => {
    const renewal = new Date(sub.renewalDate);
    const renewalTime = toTimeLocal(renewal);
    const startDateValue = sub.startDate ? new Date(sub.startDate) : null;
    const isScheduled = startDateValue ? startDateValue.getTime() > now : false;
    const nextPayment = getNextPayment(sub);
    const paymentLabel = isScheduled ? "Starts" : "Next payment";
    const reminderCopy = sub.paused
      ? "Reminders paused until resumed."
      : `Reminder ${sub.reminderDays} day(s) before each payment.`;

    return (
      <Card key={sub.id} className="flex flex-col">
        <CardHeader className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{sub.name}</CardTitle>
            <CardDescription>
              {sub.paused ? "Paused · " : ""}
              {paymentLabel} {formatDateTime(nextPayment)} · {currency(Number(sub.amount))}
            </CardDescription>
            <p className="text-xs text-muted-foreground">Card: {sub.cardName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{sub.cadence}</Badge>
            {sub.paused ? <Badge variant="outline">Paused</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-sm text-muted-foreground">{reminderCopy}</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenId(sub.id)}>
              Edit
            </Button>
            <form action={setSubscriptionPause}>
              <input type="hidden" name="subscriptionId" value={sub.id} />
              <input type="hidden" name="paused" value={sub.paused ? "false" : "true"} />
              <Button variant="outline" size="sm" type="submit">
                {sub.paused ? "Resume" : "Pause"}
              </Button>
            </form>
          </div>
        </CardContent>
        <Dialog
          open={openId === sub.id}
          onOpenChange={(open) => setOpenId(open ? sub.id : null)}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit subscription</DialogTitle>
              <DialogDescription>
                Update billing details, reminders, or the start date.
              </DialogDescription>
            </DialogHeader>
            <form action={updateSubscription} className="grid gap-4">
              <input type="hidden" name="subscriptionId" value={sub.id} />
              <label className="grid gap-1.5 text-sm font-medium">
                Service name
                <Input name="name" defaultValue={sub.name} required />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">
                  Amount
                  <Input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={sub.amount}
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Cadence
                  <Input name="cadence" defaultValue={sub.cadence} placeholder="monthly" />
                </label>
              </div>
              <label className="grid gap-1.5 text-sm font-medium">
                Card name
                <Input name="cardName" defaultValue={sub.cardName} required />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Payment time
                <Input
                  name="renewalTime"
                  type="time"
                  step="60"
                  defaultValue={renewalTime || "09:00"}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Start date
                <Input
                  name="startDate"
                  type="date"
                  defaultValue={toDateInput(sub.startDate ?? sub.renewalDate)}
                  required
                />
                <span className="text-xs font-normal text-muted-foreground">
                  This is the first payment date.
                </span>
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Reminder lead time (days)
                <Input
                  name="reminderDays"
                  type="number"
                  min="0"
                  defaultValue={sub.reminderDays}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Notes
                <Textarea
                  name="note"
                  defaultValue={sub.note ?? ""}
                  placeholder="Notes (optional)"
                />
              </label>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                <input
                  type="checkbox"
                  name="paused"
                  defaultChecked={sub.paused}
                  className="mt-1 h-4 w-4 rounded border border-input text-primary"
                />
                <div>
                  <p className="text-sm font-medium">Paused</p>
                  <p className="text-xs text-muted-foreground">
                    Stops reminders and hides from upcoming payments.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button type="submit">Save changes</Button>
                </DialogClose>
              </DialogFooter>
            </form>
            <Separator />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Delete this subscription</span>
              <form action={deleteSubscription}>
                <input type="hidden" name="subscriptionId" value={sub.id} />
                <Button type="submit" variant="ghost" className="text-destructive">
                  Delete
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Current subscriptions</h2>
          <p className="text-sm text-muted-foreground">
            Active billing and reminders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{currentSubscriptions.length}</Badge>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button>Add subscription</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>New subscription</DialogTitle>
                <DialogDescription>
                  Add a service, choose a start date, and schedule reminders.
                </DialogDescription>
              </DialogHeader>
              <form action={createSubscription} className="grid gap-4">
                <label className="grid gap-1.5 text-sm font-medium">
                  Service name
                  <Input name="name" placeholder="Service name" required />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium">
                    Amount
                    <Input
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      required
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium">
                    Cadence
                    <Input name="cadence" placeholder="monthly" defaultValue="monthly" />
                  </label>
                </div>
                <label className="grid gap-1.5 text-sm font-medium">
                  Card name
                  <Input name="cardName" placeholder="Card name" required />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Payment time
                  <Input
                    name="renewalTime"
                    type="time"
                    step="60"
                    defaultValue="09:00"
                    required
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Start date
                  <Input
                    name="startDate"
                    type="date"
                    defaultValue={toDateInput(new Date())}
                    required
                  />
                  <span className="text-xs font-normal text-muted-foreground">
                    This is the first payment date.
                  </span>
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Reminder lead time (days)
                  <Input
                    name="reminderDays"
                    type="number"
                    min="0"
                    defaultValue="3"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium">
                  Notes
                  <Textarea name="note" placeholder="Notes (optional)" />
                </label>
                <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                  <input
                    type="checkbox"
                    name="paused"
                    className="mt-1 h-4 w-4 rounded border border-input text-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Paused</p>
                    <p className="text-xs text-muted-foreground">
                      Start paused if you do not want reminders yet.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button type="submit">Save</Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {currentSubscriptions.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {currentSubscriptions
            .slice()
            .sort((a, b) => getNextPayment(a).getTime() - getNextPayment(b).getTime())
            .map(renderSubscription)}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
          No current subscriptions yet. Add one to start tracking payments.
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Scheduled subscriptions</h3>
            <p className="text-sm text-muted-foreground">
              Billing starts later, with reminders beginning on the start date.
            </p>
          </div>
          <Badge variant="secondary">{scheduledSubscriptions.length}</Badge>
        </div>
        {scheduledSubscriptions.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {scheduledSubscriptions
              .slice()
              .sort((a, b) => getNextPayment(a).getTime() - getNextPayment(b).getTime())
              .map(renderSubscription)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            No scheduled subscriptions. Add a start date to schedule one later.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Paused subscriptions</h3>
            <p className="text-sm text-muted-foreground">
              Hidden from upcoming payments until resumed.
            </p>
          </div>
          <Badge variant="secondary">{pausedSubscriptions.length}</Badge>
        </div>
        {pausedSubscriptions.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {pausedSubscriptions
              .slice()
              .sort((a, b) => getNextPayment(a).getTime() - getNextPayment(b).getTime())
              .map(renderSubscription)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
            No paused subscriptions. Pause a service to keep it out of reminders.
          </div>
        )}
      </div>
    </div>
  );
}
