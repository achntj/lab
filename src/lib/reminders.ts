import { prisma } from "@/lib/prisma";

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

  return reminders;
}
