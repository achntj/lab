import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isLocked } from "@/lib/lock-guard";
import { createBookmarkEntry } from "@/lib/bookmarks";

type BookmarkPayload = {
  url?: unknown;
  category?: unknown;
};

export async function POST(request: Request) {
  if (await isLocked()) {
    return NextResponse.json({ error: "Locked." }, { status: 423 });
  }
  let payload: BookmarkPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const url = typeof payload.url === "string" ? payload.url : "";
  const category = typeof payload.category === "string" ? payload.category : null;
  const bookmark = await createBookmarkEntry({ url, category });
  if (!bookmark) {
    return NextResponse.json({ error: "Invalid bookmark URL." }, { status: 400 });
  }

  revalidatePath("/bookmarks");
  return NextResponse.json({ id: bookmark.id });
}
