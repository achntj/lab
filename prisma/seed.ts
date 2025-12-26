import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.recordLink.deleteMany();
  await prisma.record.deleteMany();
  await prisma.financeEntry.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.event.deleteMany();
  await prisma.timer.deleteMany();
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();

  await prisma.task.createMany({
    data: [
      {
        title: "Draft project brief",
        status: "in-progress",
        priority: "high",
        dueDate: new Date(),
      },
      {
        title: "Groom backlog",
        status: "todo",
        priority: "normal",
        dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      },
      {
        title: "Ship desktop beta",
        status: "blocked",
        priority: "high",
      },
    ],
  });

  await prisma.note.createMany({
    data: [
      {
        title: "Meeting recap",
        content: "Decisions: finalize schema, build desktop shell, ship seed data.",
      },
      {
        title: "Ideas",
        content: "Command palette actions, recurring habits, expense tagging. Link back to [[Meeting recap]] to keep context close.",
      },
      {
        title: "Project Atlas",
        content: "Kickoff next week. See [[Meeting recap]] for decisions and pull tasks from backlog.",
      },
    ],
  });

  await prisma.timer.createMany({
    data: [
      { label: "Deep work", durationMinute: 50, running: false },
      { label: "Admin sweep", durationMinute: 20, running: false },
      { label: "Break", durationMinute: 10, running: false },
    ],
  });

  await prisma.event.createMany({
    data: [
      {
        title: "Design review",
        date: new Date(Date.now() + 1000 * 60 * 60 * 24),
        location: "Studio",
        description: "Walkthrough for Personal Lab UX",
      },
      {
        title: "Finance sync",
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        location: "Zoom",
        description: "Budget + runway",
      },
    ],
  });

  await prisma.bookmark.createMany({
    data: [
      {
        title: "Tauri Docs",
        url: "https://tauri.app",
        category: "Dev",
      },
      {
        title: "Next.js",
        url: "https://nextjs.org",
        category: "Dev",
      },
      {
        title: "HN",
        url: "https://news.ycombinator.com",
        category: "News",
      },
    ],
  });

  await prisma.subscription.createMany({
    data: [
      {
        name: "Notion",
        amount: 12,
        renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
        cardName: "Team Visa",
        reminderDays: 3,
        cadence: "monthly",
        note: "Team plan",
      },
      {
        name: "Figma",
        amount: 25,
        renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        cardName: "Design Amex",
        reminderDays: 5,
        cadence: "monthly",
      },
      {
        name: "Mapbox",
        amount: 49,
        renewalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        cardName: "Ops Mastercard",
        reminderDays: 2,
        cadence: "monthly",
        note: "Usage-based, monitor weekly",
      },
    ],
  });

  // Seed records for search
  const allTasks = await prisma.task.findMany();
  const allNotes = await prisma.note.findMany();
  const allBookmarks = await prisma.bookmark.findMany();
  const allSubs = await prisma.subscription.findMany();
  const allFinance = await prisma.financeEntry.findMany();
  const allTimers = await prisma.timer.findMany();

  await prisma.record.createMany({
    data: [
      ...allTasks.map((t) => ({
        kind: "task",
        source: "task",
        sourceId: String(t.id),
        title: t.title,
        content: t.priority,
        metadata: JSON.stringify({ dueDate: t.dueDate, status: t.status }),
      })),
      ...allNotes.map((n) => ({
        kind: "note",
        source: "note",
        sourceId: String(n.id),
        title: n.title,
        content: n.content,
      })),
      ...allBookmarks.map((b) => ({
        kind: "link",
        source: "bookmark",
        sourceId: String(b.id),
        title: b.title,
        url: b.url,
        category: b.category ?? undefined,
      })),
      ...allSubs.map((s) => ({
        kind: "subscription",
        source: "subscription",
        sourceId: String(s.id),
        title: s.name,
        content: s.note ?? undefined,
        category: s.cadence,
        metadata: JSON.stringify({
          amount: s.amount,
          renewalDate: s.renewalDate,
          startDate: s.startDate,
          cardName: s.cardName,
          reminderDays: s.reminderDays,
          paused: s.paused,
        }),
      })),
      ...allFinance.map((f) => ({
        kind: "finance",
        source: "finance",
        sourceId: String(f.id),
        title: `${f.kind} ${f.category}`,
        content: f.note ?? undefined,
        metadata: JSON.stringify({ amount: f.amount, occurredOn: f.occurredOn }),
      })),
      ...allTimers.map((t) => ({
        kind: "timer",
        source: "timer",
        sourceId: String(t.id),
        title: t.label,
        content: `${t.durationMinute} minutes`,
      })),
    ],
  });

  const noteRecords = await prisma.record.findMany({
    where: { source: "note", sourceId: { in: allNotes.map((n) => String(n.id)) } },
  });

  const recordByTitle = new Map(noteRecords.map((record) => [record.title, record]));
  const noteLinks: { sourceId: number; targetId: number }[] = [];
  const seen = new Set<string>();

  allNotes.forEach((note) => {
    const record = recordByTitle.get(note.title);
    if (!record) return;
    const matches = note.content.matchAll(/\[\[([^[\]]+)\]\]/g);
    for (const match of matches) {
      const targetTitle = match[1].trim();
      if (!targetTitle) continue;
      const target = recordByTitle.get(targetTitle);
      if (target && target.id !== record.id) {
        const key = `${record.id}-${target.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          noteLinks.push({ sourceId: record.id, targetId: target.id });
        }
      }
    }
  });

  if (noteLinks.length) {
    await prisma.recordLink.createMany({ data: noteLinks });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
