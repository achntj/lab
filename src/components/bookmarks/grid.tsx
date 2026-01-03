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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type Bookmark = {
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
            <div className="flex w-full min-w-0 items-center gap-3 rounded-lg border bg-card/60 px-3 py-2 transition hover:border-primary/50 hover:bg-card">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Favicon src={bookmark.faviconData ?? bookmark.faviconUrl} label={label} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-semibold text-foreground">{label}</p>
                  <p className="truncate text-xs text-muted-foreground">{bookmark.url}</p>
                </div>
                {bookmark.category ? (
                  <Badge
                    variant="secondary"
                    className="max-w-[50%] truncate rounded-md px-2 py-0 text-[10px]"
                  >
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
                <form
                  action={updateBookmark}
                  className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-2"
                >
                  <input type="hidden" name="bookmarkId" value={bookmark.id} />
                  <div className="col-span-2 grid grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3 rounded-lg border bg-muted/30 py-3 pr-3">
                    <div className="pl-3">
                      <Favicon src={bookmark.faviconData ?? bookmark.faviconUrl} label={label} />
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="break-words font-medium">{label}</p>
                      <p className="break-all text-muted-foreground">{bookmark.url}</p>
                    </div>
                  </div>
                  <Input
                    name="url"
                    defaultValue={bookmark.url}
                    required
                    className="col-start-2 min-w-0 w-full max-w-full box-border overflow-x-auto overflow-y-hidden whitespace-nowrap"
                  />
                  <Input
                    name="category"
                    defaultValue={bookmark.category ?? ""}
                    placeholder="Category (optional)"
                    className="col-start-2 min-w-0 w-full max-w-full box-border"
                  />
                  <div className="col-start-2 flex flex-wrap items-center gap-2 pt-1">
                    <DialogClose asChild>
                      <Button type="submit">Save changes</Button>
                    </DialogClose>
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
