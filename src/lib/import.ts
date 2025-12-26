import { ExportPayload } from "./export";
import { prisma } from "./prisma";

const toDate = (value: string | Date | null | undefined) =>
  value ? new Date(value) : null;

export async function importFromBackup(payload: ExportPayload) {
  await prisma.$transaction(async (tx) => {
    // Core content
    for (const task of payload.tasks) {
      const exists = await tx.task.findUnique({ where: { id: task.id } });
      if (exists) continue;
      await tx.task.create({
        data: {
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          notes: task.notes,
          dueDate: toDate(task.dueDate) ?? undefined,
          createdAt: toDate(task.createdAt) ?? undefined,
          updatedAt: toDate(task.updatedAt) ?? undefined,
        },
      });
    }

    for (const note of payload.notes) {
      const exists = await tx.note.findUnique({ where: { id: note.id } });
      if (exists) continue;
      await tx.note.create({
        data: {
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: toDate(note.createdAt) ?? undefined,
          updatedAt: toDate(note.updatedAt) ?? undefined,
        },
      });
    }

    for (const habit of payload.habits) {
      const exists = await tx.habit.findUnique({ where: { id: habit.id } });
      if (exists) continue;
      await tx.habit.create({
        data: {
          id: habit.id,
          name: habit.name,
          cadence: habit.cadence,
          streak: habit.streak,
          lastCompleted: toDate(habit.lastCompleted) ?? undefined,
          createdAt: toDate(habit.createdAt) ?? undefined,
        },
      });
    }

    for (const timer of payload.timers) {
      const exists = await tx.timer.findUnique({ where: { id: timer.id } });
      if (exists) continue;
      await tx.timer.create({
        data: {
          id: timer.id,
          label: timer.label,
          durationMinute: timer.durationMinute,
          running: timer.running,
          startedAt: toDate(timer.startedAt) ?? undefined,
          endsAt: toDate(timer.endsAt) ?? undefined,
          completed: timer.completed,
          createdAt: toDate(timer.createdAt) ?? undefined,
        },
      });
    }

    for (const weekly of payload.weeklyReviews) {
      const exists = await tx.weeklyReview.findUnique({ where: { id: weekly.id } });
      if (exists) continue;
      await tx.weeklyReview.create({
        data: {
          id: weekly.id,
          weekOf: toDate(weekly.weekOf) ?? new Date(),
          highlights: weekly.highlights,
          challenges: weekly.challenges,
          focus: weekly.focus,
          createdAt: toDate(weekly.createdAt) ?? undefined,
        },
      });
    }

    for (const finance of payload.financeEntries) {
      const exists = await tx.financeEntry.findUnique({ where: { id: finance.id } });
      if (exists) continue;
      await tx.financeEntry.create({
        data: {
          id: finance.id,
          kind: finance.kind,
          amount: finance.amount,
          category: finance.category,
          note: finance.note,
          occurredOn: toDate(finance.occurredOn) ?? new Date(),
          createdAt: toDate(finance.createdAt) ?? undefined,
        },
      });
    }

    for (const bookmark of payload.bookmarks) {
      const exists = await tx.bookmark.findUnique({ where: { id: bookmark.id } });
      if (exists) continue;
      await tx.bookmark.create({
        data: {
          id: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          category: bookmark.category,
          faviconUrl: bookmark.faviconUrl,
          faviconData: bookmark.faviconData,
          createdAt: toDate(bookmark.createdAt) ?? undefined,
          updatedAt: toDate(bookmark.updatedAt) ?? undefined,
        },
      });
    }

    for (const subscription of payload.subscriptions) {
      const exists = await tx.subscription.findUnique({ where: { id: subscription.id } });
      if (exists) continue;
      await tx.subscription.create({
        data: {
          id: subscription.id,
          name: subscription.name,
          amount: subscription.amount,
          renewalDate: toDate(subscription.renewalDate) ?? new Date(),
          cardName: subscription.cardName,
          reminderDays: subscription.reminderDays,
          cadence: subscription.cadence,
          startDate: toDate(subscription.startDate) ?? undefined,
          paused: subscription.paused ?? false,
          note: subscription.note,
          createdAt: toDate(subscription.createdAt) ?? undefined,
          updatedAt: toDate(subscription.updatedAt) ?? undefined,
        },
      });
    }

    for (const reminder of payload.reminders) {
      const exists = await tx.reminder.findUnique({
        where: { source_sourceId: { source: reminder.source, sourceId: reminder.sourceId } },
      });
      if (exists) continue;
      await tx.reminder.create({
        data: {
          id: reminder.id,
          kind: reminder.kind,
          source: reminder.source,
          sourceId: reminder.sourceId,
          triggerAt: toDate(reminder.triggerAt) ?? new Date(),
          title: reminder.title,
          message: reminder.message,
          delivered: reminder.delivered,
          createdAt: toDate(reminder.createdAt) ?? undefined,
          updatedAt: toDate(reminder.updatedAt) ?? undefined,
        },
      });
    }

    for (const record of payload.records) {
      const exists = await tx.record.findUnique({
        where: { source_sourceId: { source: record.source, sourceId: record.sourceId } },
      });
      if (exists) continue;
      await tx.record.create({
        data: {
          id: record.id,
          kind: record.kind,
          source: record.source,
          sourceId: record.sourceId,
          title: record.title,
          content: record.content,
          url: record.url,
          category: record.category,
          tags: record.tags,
          metadata: record.metadata,
          createdAt: toDate(record.createdAt) ?? undefined,
          updatedAt: toDate(record.updatedAt) ?? undefined,
        },
      });
    }

    for (const link of payload.recordLinks) {
      const exists = await tx.recordLink.findUnique({
        where: {
          sourceId_targetId_label: {
            sourceId: link.sourceId,
            targetId: link.targetId,
            label: link.label,
          },
        },
      });
      if (exists) continue;
      await tx.recordLink.create({
        data: {
          id: link.id,
          sourceId: link.sourceId,
          targetId: link.targetId,
          label: link.label,
          createdAt: toDate(link.createdAt) ?? undefined,
          updatedAt: toDate(link.updatedAt) ?? undefined,
        },
      });
    }

    for (const event of payload.events) {
      const exists = await tx.event.findUnique({ where: { id: event.id } });
      if (exists) continue;
      await tx.event.create({
        data: {
          id: event.id,
          title: event.title,
          date: toDate(event.date) ?? new Date(),
          location: event.location,
          description: event.description,
          createdAt: toDate(event.createdAt) ?? undefined,
        },
      });
    }
  });
}
