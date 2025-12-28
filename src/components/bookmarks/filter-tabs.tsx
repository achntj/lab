"use client";

import { useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { BookmarkGrid, type Bookmark } from "@/components/bookmarks/grid";
import { cn } from "@/lib/utils";

type Props = {
  bookmarks: Bookmark[];
  categories: string[];
  defaultCategory: string;
};

export function BookmarkFilters({ bookmarks, categories, defaultCategory }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedCategory = (searchParams.get("category") ?? "").trim();
  const categoryList = useMemo(() => {
    const list = new Set(categories.filter(Boolean));
    if (defaultCategory && !list.has(defaultCategory)) {
      list.add(defaultCategory);
    }
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [categories, defaultCategory]);

  const filtered = useMemo(() => {
    if (!selectedCategory) return bookmarks;
    return bookmarks.filter(
      (bookmark) => (bookmark.category ?? defaultCategory) === selectedCategory,
    );
  }, [bookmarks, defaultCategory, selectedCategory]);

  const setCategory = (category: string) => {
    startTransition(() => {
      if (category) {
        router.replace(`/bookmarks?category=${encodeURIComponent(category)}`);
      } else {
        router.replace("/bookmarks");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
        <button
          type="button"
          onClick={() => setCategory("")}
          disabled={isPending}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition shrink-0",
            !selectedCategory
              ? "border-transparent bg-primary text-primary-foreground shadow"
              : "border-border bg-card text-muted-foreground hover:bg-muted",
          )}
        >
          All
        </button>
        {categoryList.map((category) => {
          const isActive = category === selectedCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setCategory(category)}
              disabled={isPending}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition shrink-0",
                isActive
                  ? "border-transparent bg-primary text-primary-foreground shadow"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {category}
            </button>
          );
        })}
      </div>

      <BookmarkGrid key={selectedCategory || "all"} bookmarks={filtered} />
    </div>
  );
}
