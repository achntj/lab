"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { assertUnlocked } from "@/lib/lock-guard";
import { formatDateTime, nextMonthlyOccurrence, parseDateInput, toTimeLocal } from "@/lib/datetime";
import { createBookmarkEntry, fetchFaviconData, normalizeBookmarkCategory } from "@/lib/bookmarks";
import { prisma } from "@/lib/prisma";
import { syncNoteLinks } from "@/lib/note-links";
import { deleteRecord, upsertRecord } from "@/lib/records";
import { deleteReminder, upsertReminder } from "@/lib/reminders";
import { importFromBackup } from "@/lib/import";
import type { ExportPayload } from "@/lib/export";

const revalidate = (...paths: string[]) => paths.forEach((path) => revalidatePath(path));
const isNotFound = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";

export async function createTask(formData: FormData) {
  await assertUnlocked();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const status = String(formData.get("status") ?? "todo");
  const priority = String(formData.get("priority") ?? "normal");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueDate = parseDateInput(dueDateRaw);
  if (dueDateRaw && !dueDate) return;
  const notes = String(formData.get("notes") ?? "").trim();
  const reminderAt = dueDate ?? null;

  const task = await prisma.task.create({
    data: {
      title,
      status,
      priority,
      dueDate: dueDate ?? undefined,
      notes: notes || null,
    },
  });

  await upsertRecord({
    kind: "task",
    source: "task",
    sourceId: String(task.id),
    title,
    content: priority,
    metadata: { dueDate, status, notes },
  });

  if (reminderAt) {
    await upsertReminder({
      kind: "task",
      source: "task",
      sourceId: task.id,
      triggerAt: reminderAt,
      title: "Task due",
      message: `${title} is due ${formatDateTime(reminderAt)}`,
    });
  }

  revalidate("/", "/tasks", "/reminders");
}

export async function updateTaskStatus(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("taskId"));
  const status = String(formData.get("status") ?? "todo");
  if (!id) return;

  await prisma.task.update({
    where: { id },
    data: { status },
  });

  const updated = await prisma.task.findUnique({ where: { id } });
  if (updated) {
    await upsertRecord({
      kind: "task",
      source: "task",
      sourceId: String(id),
      title: updated.title,
      content: updated.priority,
      metadata: { dueDate: updated.dueDate, status: updated.status, notes: updated.notes },
    });
  }

  revalidate("/", "/tasks");
}

export async function updateTask(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("taskId"));
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "todo");
  const priority = String(formData.get("priority") ?? "normal");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const dueDate = parseDateInput(dueDateRaw);
  if (dueDateRaw && !dueDate) return;
  const reminderAt = dueDate ?? null;

  if (!id || !title) return;

  const task = await prisma.task.update({
    where: { id },
    data: { title, status, priority, dueDate, notes: notes || null },
  });

  await upsertRecord({
    kind: "task",
    source: "task",
    sourceId: String(task.id),
    title: task.title,
    content: task.priority,
    metadata: { dueDate: task.dueDate, status: task.status, notes: task.notes },
  });

  if (reminderAt) {
    await upsertReminder({
      kind: "task",
      source: "task",
      sourceId: task.id,
      triggerAt: reminderAt,
      title: "Task due",
      message: `${task.title} is due ${formatDateTime(task.dueDate)}`,
    });
  } else {
    await deleteReminder("task", task.id);
  }

  revalidate("/", "/tasks", "/reminders");
}

export async function deleteTask(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("taskId"));
  if (!id) return;
  await prisma.task.delete({ where: { id } });
  await deleteRecord("task", String(id));
  await deleteReminder("task", id);
  revalidate("/", "/tasks", "/reminders");
}

export async function createNote(formData: FormData) {
  await assertUnlocked();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title || !content) return;

  const note = await prisma.note.create({
    data: { title, content },
  });

  await upsertRecord({
    kind: "note",
    source: "note",
    sourceId: String(note.id),
    title,
    content,
  });

  await syncNoteLinks(note.id, content);

  revalidate("/", "/notes");
}

export async function updateNote(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("noteId"));
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!id || !title || !content) return;

  await prisma.note.update({
    where: { id },
    data: { title, content },
  });

  await upsertRecord({
    kind: "note",
    source: "note",
    sourceId: String(id),
    title,
    content,
  });

  await syncNoteLinks(id, content);

  revalidate("/", "/notes");
}

export async function deleteNote(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("noteId"));
  if (!id) return;

  await prisma.note.delete({ where: { id } });
  await deleteRecord("note", String(id));

  revalidate("/", "/notes");
}

export async function toggleTimer(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("timerId"));
  if (!id) return;

  const timer = await prisma.timer.findUnique({ where: { id } });
  if (!timer) return;

  const running = !timer.running;
  const endsAt = running ? new Date(Date.now() + timer.durationMinute * 60 * 1000) : null;

  await prisma.timer.update({
    where: { id },
    data: {
      running,
      startedAt: running ? new Date() : null,
      endsAt,
      completed: false,
    },
  });

  if (running && endsAt) {
    await upsertReminder({
      kind: "timer",
      source: "timer",
      sourceId: id,
      triggerAt: endsAt,
      title: "Timer finished",
      message: `${timer.label} completed`,
    });
  } else {
    await deleteReminder("timer", id);
  }

  revalidate("/timers");
}

export async function createTimer(formData: FormData) {
  await assertUnlocked();
  const label = String(formData.get("label") ?? "").trim();
  const durationMinute = Number(formData.get("durationMinute"));
  if (!label || Number.isNaN(durationMinute)) return;

  const timer = await prisma.timer.create({
    data: {
      label,
      durationMinute,
      running: false,
      completed: false,
      endsAt: null,
    },
  });

  await upsertRecord({
    kind: "timer",
    source: "timer",
    sourceId: String(timer.id),
    title: label,
    content: `${durationMinute} minutes`,
  });

  revalidate("/timers");
}

export async function deleteTimer(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("timerId"));
  if (!id) return;
  await prisma.timer.delete({ where: { id } });
  await deleteRecord("timer", String(id));
  await deleteReminder("timer", id);
  revalidate("/timers");
}

export async function createFinanceEntry(formData: FormData) {
  await assertUnlocked();
  const kind = String(formData.get("kind") ?? "").toUpperCase();
  const amountRaw = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const dateRaw = String(formData.get("occurredOn") ?? "");
  const occurredOn = dateRaw ? new Date(dateRaw) : new Date();

  if (!kind || Number.isNaN(amountRaw) || !category) return;

  const entry = await prisma.financeEntry.create({
    data: {
      kind,
      amount: amountRaw,
      category,
      note: note || null,
      occurredOn,
    },
  });

  await upsertRecord({
    kind: "finance",
    source: "finance",
    sourceId: String(entry.id),
    title: `${kind} ${category}`,
    content: note || undefined,
    metadata: { amount: amountRaw, occurredOn },
  });

  revalidate("/", "/finances");
}

export async function createBookmark(formData: FormData) {
  await assertUnlocked();
  const url = String(formData.get("url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  if (!url) return;

  const bookmark = await createBookmarkEntry({ url, category });
  if (!bookmark) return;

  revalidate("/bookmarks");
}

export async function updateBookmark(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("bookmarkId"));
  const rawUrl = String(formData.get("url") ?? "").trim();
  const category = normalizeBookmarkCategory(String(formData.get("category") ?? ""));
  if (!id || !rawUrl) return;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return;
  }
  const normalizedUrl = parsed.toString();
  const duplicate = await prisma.bookmark.findFirst({
    where: {
      id: { not: id },
      url: { in: [rawUrl, normalizedUrl] },
    },
  });
  if (duplicate) return;

  const title = parsed.hostname || normalizedUrl;

  await prisma.bookmark.update({
    where: { id },
    data: { title, url: normalizedUrl, category },
  });

  await upsertRecord({
    kind: "link",
    source: "bookmark",
    sourceId: String(id),
    title,
    url: normalizedUrl,
    category: category ?? undefined,
    metadata: { category },
  });

  revalidate("/bookmarks");
}

export async function deleteBookmark(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("bookmarkId"));
  if (!id) return;
  await prisma.bookmark.delete({ where: { id } });
  await deleteRecord("bookmark", String(id));
  revalidate("/bookmarks");
}

export async function refreshBookmarkFavicon(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("bookmarkId"));
  if (!id) return;
  const bookmark = await prisma.bookmark.findUnique({ where: { id } });
  if (!bookmark) return;
  const { faviconUrl, faviconData } = await fetchFaviconData(bookmark.url);
  await prisma.bookmark.update({
    where: { id },
    data: {
      faviconUrl: faviconUrl ?? bookmark.faviconUrl,
      faviconData: faviconData ?? bookmark.faviconData,
    },
  });
  revalidate("/bookmarks");
}

export async function refreshAllBookmarkFavicons() {
  await assertUnlocked();
  const bookmarks = await prisma.bookmark.findMany();
  for (const bookmark of bookmarks) {
    const { faviconUrl, faviconData } = await fetchFaviconData(bookmark.url);
    await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: {
        faviconUrl: faviconUrl ?? bookmark.faviconUrl,
        faviconData: faviconData ?? bookmark.faviconData,
      },
    });
  }
  revalidate("/bookmarks");
}

export async function createSubscription(formData: FormData) {
  await assertUnlocked();
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const renewalDayInput = Number(formData.get("renewalDay"));
  const renewalTimeRaw = String(formData.get("renewalTime") ?? "").trim();
  const cardName = String(formData.get("cardName") ?? "").trim();
  const reminderDays = Number(formData.get("reminderDays") ?? 3);
  const cadence = String(formData.get("cadence") ?? "monthly").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  const renewalDay = Number.isNaN(renewalDayInput)
    ? null
    : Math.min(31, Math.max(1, Math.round(renewalDayInput)));
  const renewalTime = renewalTimeRaw || "09:00";
  if (!name || Number.isNaN(amount) || renewalDay === null || !cardName) return;
  const renewalDate = nextMonthlyOccurrence(renewalDay, renewalTime);
  if (!renewalDate) return;

  const daysBefore = Number.isNaN(reminderDays) ? 3 : reminderDays;

  const subscription = await prisma.subscription.create({
    data: {
      name,
      amount,
      renewalDate,
      cardName,
      reminderDays: daysBefore,
      cadence,
      note,
    },
  });

  await upsertRecord({
    kind: "subscription",
    source: "subscription",
    sourceId: String(subscription.id),
    title: name,
    content: note ?? undefined,
    category: cadence,
    metadata: {
      amount,
      renewalDate: renewalDate.toISOString(),
      renewalDay,
      renewalTime,
      cardName,
      reminderDays: daysBefore,
    },
  });

  const triggerAt = new Date(renewalDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  await upsertReminder({
    kind: "subscription",
    source: "subscription",
    sourceId: subscription.id,
    triggerAt,
    title: "Renewal reminder",
    message: `${name} renews on ${formatDateTime(renewalDate)}`,
  });

  revalidate("/finances", "/reminders");
}

export async function updateSubscription(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("subscriptionId"));
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const renewalDayInput = Number(formData.get("renewalDay"));
  const renewalTimeRaw = String(formData.get("renewalTime") ?? "").trim();
  const cardName = String(formData.get("cardName") ?? "").trim();
  const reminderDays = Number(formData.get("reminderDays") ?? 3);
  const cadence = String(formData.get("cadence") ?? "monthly").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!id || !name || Number.isNaN(amount) || !cardName) return;

  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) return;

  const renewalDayRaw = Number.isNaN(renewalDayInput)
    ? existing.renewalDate.getDate()
    : renewalDayInput;
  const renewalDay = Math.min(31, Math.max(1, Math.round(renewalDayRaw)));
  const renewalTime = renewalTimeRaw || toTimeLocal(existing.renewalDate) || "09:00";
  const renewalDate = nextMonthlyOccurrence(renewalDay, renewalTime);
  if (!renewalDate) return;

  const daysBefore = Number.isNaN(reminderDays) ? 3 : reminderDays;

  const subscription = await prisma.subscription.update({
    where: { id },
    data: {
      name,
      amount,
      renewalDate,
      cardName,
      reminderDays: daysBefore,
      cadence,
      note,
    },
  });

  await upsertRecord({
    kind: "subscription",
    source: "subscription",
    sourceId: String(id),
    title: name,
    content: note ?? undefined,
    category: cadence,
    metadata: {
      amount,
      renewalDate: renewalDate.toISOString(),
      renewalDay,
      renewalTime,
      cardName,
      reminderDays: daysBefore,
    },
  });

  const triggerAt = new Date(renewalDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

  await upsertReminder({
    kind: "subscription",
    source: "subscription",
    sourceId: subscription.id,
    triggerAt,
    title: "Renewal reminder",
    message: `${subscription.name} renews on ${formatDateTime(subscription.renewalDate)}`,
  });

  revalidate("/finances", "/reminders");
}

export async function deleteSubscription(formData: FormData) {
  await assertUnlocked();
  const id = Number(formData.get("subscriptionId"));
  if (!id) return;
  await prisma.subscription.delete({ where: { id } }).catch((error) => {
    if (!isNotFound(error)) throw error;
  });
  await deleteRecord("subscription", String(id));
  await deleteReminder("subscription", id);
  revalidate("/finances", "/reminders");
}

export async function importBackup(formData: FormData) {
  await assertUnlocked();
  const file = formData.get("backup");
  if (!file || !(file instanceof File)) return;

  const text = await file.text();
  let payload: ExportPayload;
  try {
    payload = JSON.parse(text) as ExportPayload;
  } catch (error) {
    console.error("Invalid backup JSON", error);
    return;
  }

  await importFromBackup(payload);
  revalidate("/", "/tasks", "/notes", "/bookmarks", "/timers", "/finances", "/reminders");
}
