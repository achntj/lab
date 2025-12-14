import { prisma } from "@/lib/prisma";

const WIKI_LINK = /\[\[([^[\]]+)\]\]/g;

export function extractNoteLinks(content: string): string[] {
  const mentions = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = WIKI_LINK.exec(content)) !== null) {
    const value = match[1].trim();
    if (value) mentions.add(value);
  }

  return Array.from(mentions);
}

export async function syncNoteLinks(noteId: number, content: string) {
  const titles = extractNoteLinks(content);
  const record = await prisma.record.findUnique({
    where: { source_sourceId: { source: "note", sourceId: String(noteId) } },
  });
  if (!record) return;

  // Reset existing links from this note to avoid stale edges.
  await prisma.recordLink.deleteMany({ where: { sourceId: record.id } });

  if (!titles.length) return;

  const targets = await prisma.record.findMany({
    where: { title: { in: titles } },
  });

  const targetIds = targets
    .filter((target) => target.id !== record.id)
    .map((target) => target.id);

  if (!targetIds.length) return;

  await prisma.recordLink.createMany({
    data: targetIds.map((targetId) => ({
      sourceId: record.id,
      targetId,
    })),
    skipDuplicates: true,
  });
}
