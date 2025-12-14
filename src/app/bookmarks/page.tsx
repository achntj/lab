import { createBookmark } from "@/app/actions";
import { BookmarkGrid } from "@/components/bookmarks/grid";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";

export default async function BookmarksPage() {
  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookmarks"
        description="Bookmark grid with cached favicons and inline editing."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add bookmark</CardTitle>
          <CardDescription>Store link + optional category. Favicons cached on save.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBookmark} className="grid gap-3 md:grid-cols-3">
            <Input name="url" placeholder="https://…" type="url" required />
            <Input name="category" placeholder="Category (optional)" />
            <button
              type="submit"
              className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Save
            </button>
          </form>
        </CardContent>
      </Card>

      <BookmarkGrid bookmarks={bookmarks} />
    </div>
  );
}
