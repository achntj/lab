import { createBookmark, refreshAllBookmarkFavicons } from "@/app/actions";
import { BookmarkFilters } from "@/components/bookmarks/filter-tabs";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEFAULT_BOOKMARK_CATEGORY } from "@/lib/bookmarks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  await prisma.bookmark.updateMany({
    where: { OR: [{ category: null }, { category: "" }] },
    data: { category: DEFAULT_BOOKMARK_CATEGORY },
  });
  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { createdAt: "desc" },
  });
  const categories = Array.from(
    new Set(bookmarks.map((bookmark) => bookmark.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookmarks"
        description="Bookmark grid with cached favicons and inline editing."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Add bookmark</CardTitle>
              <CardDescription>Store link + optional category. Favicons cached on save.</CardDescription>
            </div>
            <form action={refreshAllBookmarkFavicons}>
              <button
                type="submit"
                className="h-9 rounded-md border px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted"
              >
                Refresh all icons
              </button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <form action={createBookmark} className="grid gap-3 md:grid-cols-3">
            <Input name="url" placeholder="https://…" type="url" required />
            <Input name="category" placeholder="Category (default: Design)" />
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Save
            </button>
          </form>
        </CardContent>
      </Card>

      <BookmarkFilters
        bookmarks={bookmarks}
        categories={categories}
        defaultCategory={DEFAULT_BOOKMARK_CATEGORY}
      />
    </div>
  );
}
