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

const MONTHS = [
  ["01", "january", "jan"],
  ["02", "february", "feb"],
  ["03", "march", "mar"],
  ["04", "april", "apr"],
  ["05", "may", "may"],
  ["06", "june", "jun"],
  ["07", "july", "jul"],
  ["08", "august", "aug"],
  ["09", "september", "sep"],
  ["10", "october", "oct"],
  ["11", "november", "nov"],
  ["12", "december", "dec"],
];

const toJson = (value?: Record<string, unknown> | string | null) => {
  if (!value) return null;
  if (typeof value === "string") return value;

  const tokens = extractDateTokens(value);
  const payload =
    tokens.length > 0
      ? {
          ...value,
          __searchDates: tokens.join(" "),
        }
      : value;

  return JSON.stringify(payload);
};

function extractDateTokens(input: unknown): string[] {
  const tokens = new Set<string>();

  const visit = (val: unknown) => {
    if (val == null) return;
    if (val instanceof Date) {
      addDateTokens(tokens, val);
      return;
    }
    if (typeof val === "string") {
      const iso = parseDateString(val);
      if (iso) {
        addDateTokens(tokens, iso);
      }
      return;
    }
    if (Array.isArray(val)) {
      val.forEach(visit);
      return;
    }
    if (typeof val === "object") {
      Object.values(val as Record<string, unknown>).forEach(visit);
    }
  };

  visit(input);
  return Array.from(tokens);
}

function parseDateString(str: string): Date | null {
  const clean = str.trim();
  if (!clean) return null;
  // ISO-like
  const iso = clean.match(/^(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2}))?)?$/);
  if (iso) {
    const [, y, m, d] = iso;
    const month = m ? m.padStart(2, "0") : "01";
    const day = d ? d.padStart(2, "0") : "01";
    const dt = new Date(`${y}-${month}-${day}T00:00:00Z`);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Month name patterns (e.g., December 15 2025)
  const monthName = clean.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,)?\s+(\d{4})$/);
  if (monthName) {
    const [, name, day, year] = monthName;
    const m = MONTHS.find(([, full, short]) => {
      const lower = name.toLowerCase();
      return lower === full || lower === short;
    });
    if (!m) return null;
    const dt = new Date(`${year}-${m[0]}-${day.padStart(2, "0")}T00:00:00Z`);
    return isNaN(dt.getTime()) ? null : dt;
  }

  return null;
}

function addDateTokens(tokens: Set<string>, date: Date) {
  const y = date.getUTCFullYear().toString();
  const mNum = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const dNum = date.getUTCDate().toString().padStart(2, "0");
  const mNames = MONTHS[parseInt(mNum, 10) - 1];
  if (!mNames) return;
  const [m, full, short] = mNames;

  const combos = [
    y,
    `${y}-${m}`,
    `${y}${m}`,
    `${y}-${m}-${dNum}`,
    `${y}${m}${dNum}`,
    m,
    full,
    short,
    `${m}-${dNum}`,
    `${m}${dNum}`,
    `${full}-${dNum}`,
    `${full}${dNum}`,
    `${short}-${dNum}`,
    `${short}${dNum}`,
    dNum,
  ];

  combos.forEach((t) => tokens.add(t.toLowerCase()));
}

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
