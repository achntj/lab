import { prisma } from "@/lib/prisma";

type RecordInput = {
  kind: string;
  source: string;
  sourceId: string;
  title: string;
  content?: string | null;
  url?: string | null;
  category?: string | null;
  tags?: string | null;
  metadata?: Record<string, unknown> | string | null;
};

const toJson = (value?: Record<string, unknown> | string | null) => {
  if (!value) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
};

export async function upsertRecord(input: RecordInput) {
  const metadata = toJson(input.metadata);
  await prisma.record.upsert({
    where: {
      source_sourceId: {
        source: input.source,
        sourceId: input.sourceId,
      },
    },
    update: {
      kind: input.kind,
      title: input.title,
      content: input.content ?? null,
      url: input.url ?? null,
      category: input.category ?? null,
      tags: input.tags ?? null,
      metadata,
    },
    create: {
      kind: input.kind,
      source: input.source,
      sourceId: input.sourceId,
      title: input.title,
      content: input.content ?? null,
      url: input.url ?? null,
      category: input.category ?? null,
      tags: input.tags ?? null,
      metadata,
    },
  });
}

export async function deleteRecord(source: string, sourceId: string) {
  await prisma.record.deleteMany({
    where: { source, sourceId },
  });
}
