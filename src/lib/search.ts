import { prisma } from "@/lib/prisma";

export type SearchResult = {
  id: number;
  kind: string;
  title: string;
  content: string | null;
  url: string | null;
  category: string | null;
  source: string;
  sourceId: string;
};

export async function searchRecords(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const q = query.includes("*") ? query : `${query}*`;

  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT r.id, r.kind, r.title, r.content, r.url, r.category, r.source, r.sourceId
    FROM "RecordSearch"
    JOIN "Record" r ON r.id = "RecordSearch".rowid
    WHERE "RecordSearch" MATCH ${q}
    ORDER BY bm25("RecordSearch")
    LIMIT 25;
  `;

  return results;
}
