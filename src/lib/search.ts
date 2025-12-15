import { Prisma } from "@prisma/client";

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

export async function searchRecords(rawQuery: string): Promise<SearchResult[]> {
  const parsed = parseQuery(rawQuery);
  if (!parsed.ftsTokens.length && !parsed.likePatterns.length) return [];

  const ftsResults = parsed.ftsTokens.length ? await runFts(parsed.ftsTokens) : [];

  if (parsed.ftsTokens.length === 0 || ftsResults.length < 25) {
    const likeResults = await runLike(parsed.likePatterns);
    const merged = dedupeById([...ftsResults, ...likeResults]);
    return merged.slice(0, 25);
  }

  return ftsResults.slice(0, 25);
}

async function runFts(tokens: string[]) {
  const matchExpr = tokens.map((t) => `${t}*`).join(" AND ");
  return prisma.$queryRaw<SearchResult[]>(Prisma.sql`
    SELECT r.id, r.kind, r.title, r.content, r.url, r.category, r.source, r.sourceId
    FROM "RecordSearch"
    JOIN "Record" r ON r.id = "RecordSearch".rowid
    WHERE "RecordSearch" MATCH ${matchExpr}
    ORDER BY bm25("RecordSearch") ASC, r.updatedAt DESC
    LIMIT 50;
  `);
}

async function runLike(patterns: string[]) {
  if (!patterns.length) return [];
  const clauses = patterns.map((p) => {
    const like = `%${p}%`;
    return Prisma.sql`(
      lower(r.title) LIKE ${like}
      OR lower(coalesce(r.content, '')) LIKE ${like}
      OR lower(coalesce(r.url, '')) LIKE ${like}
      OR lower(coalesce(r.category, '')) LIKE ${like}
      OR lower(coalesce(r.tags, '')) LIKE ${like}
      OR lower(coalesce(r.metadata, '')) LIKE ${like}
    )`;
  });

  const where = Prisma.join(clauses, " AND ");

  return prisma.$queryRaw<SearchResult[]>(Prisma.sql`
    SELECT r.id, r.kind, r.title, r.content, r.url, r.category, r.source, r.sourceId
    FROM "Record" r
    WHERE ${where}
    ORDER BY r.updatedAt DESC
    LIMIT 50;
  `);
}

const MONTHS: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

type ParsedQuery = {
  ftsTokens: string[];
  likePatterns: string[];
};

function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  if (!trimmed) return { ftsTokens: [], likePatterns: [] };

  const parts = trimmed.split(/\s+/);
  const tokens: string[] = [];
  const likes: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Year + month/day separated by spaces (e.g., 2026 01 14)
    const yearOnly = part.match(/^(\d{4})$/);
    if (yearOnly) {
      const y = yearOnly[1];
      tokens.push(y, y.replace(/-/g, ""));
      likes.push(y);
      const next = parts[i + 1];
      const monthMatch = next?.match(/^(\d{1,2})$/);
      if (monthMatch) {
        const m = monthMatch[1].padStart(2, "0");
        tokens.push(`${y}-${m}`, `${y}${m}`, m);
        likes.push(`${y}-${m}`, m);
        const nextDay = parts[i + 2];
        const dayMatch = nextDay?.match(/^(\d{1,2})$/);
        if (dayMatch) {
          const d = dayMatch[1].padStart(2, "0");
          tokens.push(`${y}-${m}-${d}`, `${y}${m}${d}`, d);
          likes.push(`${y}-${m}-${d}`, d);
        }
      }
      continue;
    }

    const iso = part.match(/^(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2}))?)?$/);
    if (iso) {
      const [, y, m, d] = iso;
      if (y) {
        tokens.push(y, y.replace(/-/g, ""));
        likes.push(y);
      }
      if (m) {
        const month = m.padStart(2, "0");
        tokens.push(`${y}-${month}`, `${y}${month}`, month);
        likes.push(`${y}-${month}`, month);
      }
      if (m && d) {
        const day = d.padStart(2, "0");
        tokens.push(`${y}-${m.padStart(2, "0")}-${day}`, `${y}${m.padStart(2, "0")}${day}`, day);
        likes.push(`${y}-${m.padStart(2, "0")}-${day}`, day);
      }
      likes.push(part.toLowerCase());
      continue;
    }

    const alpha = part.toLowerCase().replace(/[^a-z]/g, "");
    if (MONTHS[alpha]) {
      const monthNum = MONTHS[alpha];
      tokens.push(monthNum, alpha);
      likes.push(alpha, monthNum);

      const maybeDayOnly = parts[i + 1];
      const dayOnlyMatch = maybeDayOnly?.match(/^(\d{1,2})$/);
      if (dayOnlyMatch) {
        const day = dayOnlyMatch[1].padStart(2, "0");
        tokens.push(`${monthNum}-${day}`, `${monthNum}${day}`, day, alpha + day);
        likes.push(`${monthNum}-${day}`, day, `${alpha}${day}`);
      }

      const maybeYear = parts[i + 1];
      const yearMatch = maybeYear?.match(/^(\d{4})$/);
      if (yearMatch) {
        const year = yearMatch[1];
        tokens.push(year, `${year}-${monthNum}`, `${year}${monthNum}`);
        likes.push(year, `${year}-${monthNum}`);
        const maybeDay = parts[i + 2];
        const dayMatch = maybeDay?.match(/^(\d{1,2})$/);
        if (dayMatch) {
          const day = dayMatch[1].padStart(2, "0");
          tokens.push(`${year}-${monthNum}-${day}`, `${year}${monthNum}${day}`, day);
          likes.push(`${year}-${monthNum}-${day}`, day);
        }
      }
      continue;
    }

    const cleaned = part.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (cleaned.length >= 2) {
      tokens.push(cleaned);
      likes.push(cleaned);
    }
  }

  const ftsTokens = dedupe(tokens);
  const likePatterns = dedupe(likes);
  return { ftsTokens, likePatterns };
}

const dedupe = (arr: string[]) => arr.filter((v, i) => arr.indexOf(v) === i);

function dedupeById(items: SearchResult[]) {
  const map = new Map<number, SearchResult>();
  items.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
}
