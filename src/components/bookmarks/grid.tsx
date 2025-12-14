"use client";

import { useState } from "react";
import Image from "next/image";
import { Pencil } from "lucide-react";

import {
  deleteBookmark,
  refreshBookmarkFavicon,
  updateBookmark,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Bookmark = {
  id: number;
  title: string;
  url: string;
  category: string | null;
  faviconData: string | null;
  faviconUrl: string | null;
};

function labelFromUrl(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function Favicon({ src, label }: { src?: string | null; label: string }) {
  if (!src) {
    return (
      <div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
        {label.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={32}
      height={32}
      className="h-8 w-8 rounded-md border bg-white object-contain p-1"
      unoptimized
    />
  );
}

export function BookmarkGrid({ bookmarks }: { bookmarks: Bookmark[] }) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bookmarks.map((bookmark) => {
        const label = labelFromUrl(bookmark.url);
        return (
          <div key={bookmark.id}>
            <div className="flex w-full items-center gap-3 rounded-lg border bg-card/60 px-3 py-2 transition hover:border-primary/50 hover:bg-card">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center gap-3 text-left"
              >
                <Favicon src={bookmark.faviconData ?? bookmark.faviconUrl} label={label} />
                <div className="flex-1 truncate">
                  <p className="truncate text-sm font-semibold text-foreground">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">{bookmark.url}</p>
                </div>
                {bookmark.category ? (
                  <Badge variant="secondary" className="rounded-md px-2 py-0 text-[10px]">
                    {bookmark.category}
                  </Badge>
                ) : null}
              </a>
              <button
                type="button"
                onClick={() => setOpenId(bookmark.id)}
                className="rounded-md p-1 text-muted-foreground transition hover:bg-muted"
                aria-label="Edit bookmark"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>

            <Dialog
              open={openId === bookmark.id}
              onOpenChange={(open) => setOpenId(open ? bookmark.id : null)}
            >
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Edit bookmark</DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-3">
                  <Favicon src={bookmark.faviconData ?? bookmark.faviconUrl} label={label} />
                  <div className="truncate text-sm">
                    <p className="font-medium">{label}</p>
                    <p className="text-muted-foreground">{bookmark.url}</p>
                  </div>
                </div>
                <form action={updateBookmark} className="grid gap-2">
                  <input type="hidden" name="bookmarkId" value={bookmark.id} />
                  <Input name="url" defaultValue={bookmark.url} required />
                  <Input
                    name="category"
                    defaultValue={bookmark.category ?? ""}
                    placeholder="Category (optional)"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button type="submit">Save changes</Button>
                  </div>
                </form>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={refreshBookmarkFavicon}>
                    <input type="hidden" name="bookmarkId" value={bookmark.id} />
                    <Button type="submit" variant="outline">
                      Refresh icon
                    </Button>
                  </form>
                  <form action={deleteBookmark}>
                    <input type="hidden" name="bookmarkId" value={bookmark.id} />
                    <Button type="submit" variant="ghost" className="text-destructive">
                      Delete
                    </Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );
      })}
    </div>
  );
}
