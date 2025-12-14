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

  await prisma.reminder.updateMany({
    where: { id: { in: reminders.map((r) => r.id) } },
    data: { delivered: true },
  });

  for (const reminder of reminders) {
    if (reminder.kind !== "subscription") continue;
    const subscriptionId = Number(reminder.sourceId);
    if (Number.isNaN(subscriptionId)) continue;
    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) continue;

    const next = nextMonthlyOccurrence(
      subscription.renewalDate.getDate(),
      toTimeLocal(subscription.renewalDate),
      new Date(subscription.renewalDate.getTime() + 60 * 1000),
    );
    if (!next) continue;

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { renewalDate: next },
    });

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        triggerAt: next,
        delivered: false,
        message: `${subscription.name} renews on ${formatDateTime(next)}`,
      },
    });
  }

  return reminders;
}
