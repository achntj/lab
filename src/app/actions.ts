"use server";

import { Buffer } from "buffer";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { syncNoteLinks } from "@/lib/note-links";
import { deleteRecord, upsertRecord } from "@/lib/records";
import { deleteReminder, upsertReminder } from "@/lib/reminders";

const revalidate = (...paths: string[]) => paths.forEach((path) => revalidatePath(path));

async function fetchFaviconData(url: string) {
  try {
    const target = new URL(url);
    const trySources = [
      `https://www.google.com/s2/favicons?domain=${target.hostname}&sz=64`,
      `${target.origin}/favicon.ico`,
    ];

    for (const src of trySources) {
      const res = await fetch(src);
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "image/png";
      const buffer = Buffer.from(await res.arrayBuffer());
      const base64 = buffer.toString("base64");
      return {
        faviconUrl: src,
        faviconData: `data:${contentType};base64,${base64}`,
      };
    }

    return { faviconUrl: null, faviconData: null };
  } catch (error) {
    console.error("Failed to fetch favicon", error);
    return { faviconUrl: null as string | null, faviconData: null as string | null };
  }
}

export async function createTask(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const status = String(formData.get("status") ?? "todo");
  const priority = String(formData.get("priority") ?? "normal");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : undefined;
  const notes = String(formData.get("notes") ?? "").trim();
  const reminderAt = dueDate ? new Date(dueDate.getTime() - 24 * 60 * 60 * 1000) : null;

  const task = await prisma.task.create({
    data: {
      title,
      status,
      priority,
      dueDate,
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
      title: "Task due soon",
      message: `${title} is due ${dueDate?.toDateString()}`,
    });
  }

  revalidate("/", "/tasks");
}

export async function updateTaskStatus(formData: FormData) {
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
  const id = Number(formData.get("taskId"));
  const title = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "todo");
  const priority = String(formData.get("priority") ?? "normal");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const reminderAt = dueDate ? new Date(dueDate.getTime() - 24 * 60 * 60 * 1000) : null;

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
      title: "Task due soon",
      message: `${task.title} is due ${task.dueDate?.toDateString()}`,
    });
  } else {
    await deleteReminder("task", task.id);
  }

  revalidate("/", "/tasks");
}

export async function deleteTask(formData: FormData) {
  const id = Number(formData.get("taskId"));
  if (!id) return;
  await prisma.task.delete({ where: { id } });
  await deleteRecord("task", String(id));
  await deleteReminder("task", id);
  revalidate("/", "/tasks");
}

export async function createNote(formData: FormData) {
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

export async function toggleTimer(formData: FormData) {
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
  const id = Number(formData.get("timerId"));
  if (!id) return;
  await prisma.timer.delete({ where: { id } });
  await deleteRecord("timer", String(id));
  await deleteReminder("timer", id);
  revalidate("/timers");
}

export async function createFinanceEntry(formData: FormData) {
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
  const url = String(formData.get("url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  if (!url) return;

  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }
  const title = hostname || url;

  const { faviconUrl, faviconData } = await fetchFaviconData(url);

  const bookmark = await prisma.bookmark.create({
    data: {
      title,
      url,
      category,
      faviconUrl: faviconUrl ?? undefined,
      faviconData: faviconData ?? undefined,
    },
  });

  await upsertRecord({
    kind: "link",
    source: "bookmark",
    sourceId: String(bookmark.id),
    title,
    url,
    category: category ?? undefined,
    metadata: { category },
  });

  revalidate("/bookmarks");
}

export async function updateBookmark(formData: FormData) {
  const id = Number(formData.get("bookmarkId"));
  const url = String(formData.get("url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  if (!id || !url) return;

  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return;
  }
  const title = hostname || url;

  await prisma.bookmark.update({
    where: { id },
    data: { title, url, category },
  });

  await upsertRecord({
    kind: "link",
    source: "bookmark",
    sourceId: String(id),
    title,
    url,
    category: category ?? undefined,
    metadata: { category },
  });

  revalidate("/bookmarks");
}

export async function deleteBookmark(formData: FormData) {
  const id = Number(formData.get("bookmarkId"));
  if (!id) return;
  await prisma.bookmark.delete({ where: { id } });
  await deleteRecord("bookmark", String(id));
  revalidate("/bookmarks");
}

export async function refreshBookmarkFavicon(formData: FormData) {
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
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const renewalRaw = String(formData.get("renewalDate") ?? "");
  const cardName = String(formData.get("cardName") ?? "").trim();
  const reminderDays = Number(formData.get("reminderDays") ?? 3);
  const cadence = String(formData.get("cadence") ?? "monthly").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!name || Number.isNaN(amount) || !renewalRaw || !cardName) return;

  const renewalDate = new Date(renewalRaw);

  const subscription = await prisma.subscription.create({
    data: {
      name,
      amount,
      renewalDate,
      cardName,
      reminderDays: Number.isNaN(reminderDays) ? 3 : reminderDays,
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
    metadata: { amount, renewalDate: renewalRaw, cardName, reminderDays },
  });

  const triggerAt = new Date(
    renewalDate.getTime() - (Number.isNaN(reminderDays) ? 3 : reminderDays) * 24 * 60 * 60 * 1000,
  );
  await upsertReminder({
    kind: "subscription",
    source: "subscription",
    sourceId: subscription.id,
    triggerAt,
    title: "Renewal reminder",
    message: `${name} renews on ${renewalDate.toDateString()}`,
  });

  revalidate("/finances");
}

export async function updateSubscription(formData: FormData) {
  const id = Number(formData.get("subscriptionId"));
  const name = String(formData.get("name") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const renewalRaw = String(formData.get("renewalDate") ?? "");
  const cardName = String(formData.get("cardName") ?? "").trim();
  const reminderDays = Number(formData.get("reminderDays") ?? 3);
  const cadence = String(formData.get("cadence") ?? "monthly").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!id || !name || Number.isNaN(amount) || !renewalRaw || !cardName) return;

  const subscription = await prisma.subscription.update({
    where: { id },
    data: {
      name,
      amount,
      renewalDate: new Date(renewalRaw),
      cardName,
      reminderDays: Number.isNaN(reminderDays) ? 3 : reminderDays,
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
    metadata: { amount, renewalDate: renewalRaw, cardName, reminderDays },
  });

  const triggerAt = new Date(
    new Date(renewalRaw).getTime() - (Number.isNaN(reminderDays) ? 3 : reminderDays) * 24 * 60 * 60 * 1000,
  );

  await upsertReminder({
    kind: "subscription",
    source: "subscription",
    sourceId: subscription.id,
    triggerAt,
    title: "Renewal reminder",
    message: `${subscription.name} renews on ${subscription.renewalDate.toDateString()}`,
  });

  revalidate("/finances");
}

export async function deleteSubscription(formData: FormData) {
  const id = Number(formData.get("subscriptionId"));
  if (!id) return;
  await prisma.subscription.delete({ where: { id } });
  await deleteRecord("subscription", String(id));
  await deleteReminder("subscription", id);
  revalidate("/finances");
}
