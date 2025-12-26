import { prisma } from "@/lib/prisma";
import { formatDateTime, nextMonthlyOccurrence, toTimeLocal } from "@/lib/datetime";

type ReminderInput = {
  kind: string;
  source: string;
  sourceId: string | number;
  triggerAt: Date;
  title: string;
  message: string;
};

const buildStartBoundary = (startDate: Date | null, time: string) => {
  if (!startDate) return null;
  const [hour = 0, minute = 0] = time.split(":").map((part) => Number(part));
  return new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
    Number.isNaN(hour) ? 0 : hour,
    Number.isNaN(minute) ? 0 : minute,
    0,
    0,
  );
};

export async function upsertReminder(input: ReminderInput) {
  await prisma.reminder.upsert({
    where: {
      source_sourceId: {
        source: input.source,
        sourceId: String(input.sourceId),
      },
    },
    update: {
      kind: input.kind,
      triggerAt: input.triggerAt,
      title: input.title,
      message: input.message,
      delivered: false,
    },
    create: {
      kind: input.kind,
      source: input.source,
      sourceId: String(input.sourceId),
      triggerAt: input.triggerAt,
      title: input.title,
      message: input.message,
    },
  });
}

export async function deleteReminder(source: string, sourceId: string | number) {
  await prisma.reminder.deleteMany({
    where: { source, sourceId: String(sourceId) },
  });
}

export async function fetchDueReminders() {
  const now = new Date();
  const reminders = await prisma.reminder.findMany({
    where: { delivered: false, triggerAt: { lte: now } },
    orderBy: { triggerAt: "asc" },
    take: 20,
  });

  if (!reminders.length) return [];

  const deliverableReminders: typeof reminders = [];
  const subscriptionReminders: Array<{
    reminder: (typeof reminders)[number];
    subscription: { id: number; name: string; renewalDate: Date };
    next: Date;
  }> = [];

  for (const reminder of reminders) {
    if (reminder.kind !== "subscription") {
      deliverableReminders.push(reminder);
      continue;
    }

    const subscriptionId = Number(reminder.sourceId);
    if (Number.isNaN(subscriptionId)) continue;
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) {
      await prisma.reminder.delete({ where: { id: reminder.id } });
      continue;
    }
    if (subscription.paused) {
      await prisma.reminder.delete({ where: { id: reminder.id } });
      continue;
    }

    const renewalTime = toTimeLocal(subscription.renewalDate) || "09:00";
    const startBoundary = buildStartBoundary(subscription.startDate, renewalTime);
    if (startBoundary && startBoundary > now && reminder.triggerAt < startBoundary) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { triggerAt: startBoundary, delivered: false },
      });
      continue;
    }

    const next = nextMonthlyOccurrence(
      subscription.renewalDate.getDate(),
      renewalTime,
      new Date(subscription.renewalDate.getTime() + 60 * 1000),
    );
    if (!next) continue;

    deliverableReminders.push(reminder);
    subscriptionReminders.push({ reminder, subscription, next });
  }

  if (deliverableReminders.length) {
    await prisma.reminder.updateMany({
      where: { id: { in: deliverableReminders.map((reminder) => reminder.id) } },
      data: { delivered: true },
    });
  }

  for (const entry of subscriptionReminders) {
    await prisma.subscription.update({
      where: { id: entry.subscription.id },
      data: { renewalDate: entry.next },
    });

    await prisma.reminder.update({
      where: { id: entry.reminder.id },
      data: {
        triggerAt: entry.next,
        delivered: false,
        message: `${entry.subscription.name} payment on ${formatDateTime(entry.next)}`,
      },
    });
  }

  return deliverableReminders;
}
