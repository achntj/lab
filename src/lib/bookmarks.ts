import { Buffer } from "buffer";

import { prisma } from "@/lib/prisma";
import { upsertRecord } from "@/lib/records";

export const DEFAULT_BOOKMARK_CATEGORY = "Design";

type BookmarkInput = {
  url: string;
  category?: string | null;
};

export const normalizeBookmarkCategory = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : DEFAULT_BOOKMARK_CATEGORY;
};

export async function fetchFaviconData(url: string) {
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

export async function createBookmarkEntry(input: BookmarkInput) {
  const rawUrl = input.url.trim();
  const category = normalizeBookmarkCategory(input.category);
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  const normalizedUrl = parsed.toString();
  const existing = await prisma.bookmark.findFirst({
    where: {
      url: { in: [rawUrl, normalizedUrl] },
    },
  });
  if (existing) return existing;

  const title = parsed.hostname || normalizedUrl;

  const { faviconUrl, faviconData } = await fetchFaviconData(normalizedUrl);

  const bookmark = await prisma.bookmark.create({
    data: {
      title,
      url: normalizedUrl,
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
    url: normalizedUrl,
    category: category ?? undefined,
    metadata: { category },
  });

  return bookmark;
}
