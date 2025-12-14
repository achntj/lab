import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const [timers, subscriptions] = await Promise.all([
    prisma.timer.findMany({ where: { running: true } }),
    prisma.subscription.findMany(),
  ]);

  const now = Date.now();

  const reminders = subscriptions
    .map((sub) => {
      const daysUntil =
        (new Date(sub.renewalDate).getTime() - now) / (1000 * 60 * 60 * 24);
      return { ...sub, daysUntil };
    })
    .filter((sub) => sub.daysUntil >= 0 && sub.daysUntil <= sub.reminderDays);

  return NextResponse.json({
    timers: timers.map((t) => ({
      id: t.id,
      label: t.label,
      endsAt: t.endsAt,
    })),
    reminders: reminders.map((sub) => ({
      id: sub.id,
      name: sub.name,
      amount: sub.amount,
      renewalDate: sub.renewalDate,
      daysUntil: sub.daysUntil,
    })),
  });
}
