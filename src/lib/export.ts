import type {
  Bookmark,
  Event,
  FinanceEntry,
  Habit,
  Note,
  Record as RecordModel,
  RecordLink,
  Reminder,
  Subscription,
  Task,
  Timer,
  WeeklyReview,
} from "@prisma/client";

import { prisma } from "./prisma";

export type ExportPayload = {
  generatedAt: string;
  tasks: Task[];
  notes: Note[];
  habits: Habit[];
  timers: Timer[];
  weeklyReviews: WeeklyReview[];
  financeEntries: FinanceEntry[];
  bookmarks: Bookmark[];
  subscriptions: Subscription[];
  reminders: Reminder[];
  records: RecordModel[];
  recordLinks: RecordLink[];
  events: Event[];
};

export async function exportAllData(): Promise<ExportPayload> {
  const [
    tasks,
    notes,
    habits,
    timers,
    weeklyReviews,
    financeEntries,
    bookmarks,
    subscriptions,
    reminders,
    records,
    recordLinks,
    events,
  ] = await Promise.all([
    prisma.task.findMany({ orderBy: { id: "asc" } }),
    prisma.note.findMany({ orderBy: { id: "asc" } }),
    prisma.habit.findMany({ orderBy: { id: "asc" } }),
    prisma.timer.findMany({ orderBy: { id: "asc" } }),
    prisma.weeklyReview.findMany({ orderBy: { id: "asc" } }),
    prisma.financeEntry.findMany({ orderBy: { id: "asc" } }),
    prisma.bookmark.findMany({ orderBy: { id: "asc" } }),
    prisma.subscription.findMany({ orderBy: { id: "asc" } }),
    prisma.reminder.findMany({ orderBy: { id: "asc" } }),
    prisma.record.findMany({ orderBy: { id: "asc" } }),
    prisma.recordLink.findMany({ orderBy: { id: "asc" } }),
    prisma.event.findMany({ orderBy: { id: "asc" } }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    tasks,
    notes,
    habits,
    timers,
    weeklyReviews,
    financeEntries,
    bookmarks,
    subscriptions,
    reminders,
    records,
    recordLinks,
    events,
  };
}
