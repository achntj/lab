"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { useHotkey } from "@/components/hotkeys/hotkey-provider";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: number;
  kind: string;
  title: string;
  content: string | null;
  url: string | null;
  category: string | null;
  source: string;
  sourceId: string;
};

export const SEARCH_MODAL_EVENT = "personal-lab-open-search";
export const SEARCH_MODAL_CLOSE_EVENT = "personal-lab-close-search";

export function triggerSearchModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SEARCH_MODAL_EVENT));
}

export function closeSearchModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SEARCH_MODAL_CLOSE_EVENT));
}

export function SearchModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const closeModal = useCallback((broadcast = false) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    if (broadcast) closeSearchModal();
  }, []);

  useHotkey("quickSearch", () => setOpen(true));

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    const handleClose = () => closeModal();
    window.addEventListener(SEARCH_MODAL_EVENT, handleOpen);
    window.addEventListener(SEARCH_MODAL_CLOSE_EVENT, handleClose);
    return () => {
      window.removeEventListener(SEARCH_MODAL_EVENT, handleOpen);
      window.removeEventListener(SEARCH_MODAL_CLOSE_EVENT, handleClose);
    };
  }, [closeModal]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const run = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    };
    const t = setTimeout(run, 120);
    return () => {
      clearTimeout(t);
      controller.abort();
      setIsLoading(false);
    };
  }, [query]);

  const handleSelect = (res: SearchResult) => {
    closeModal(true);
    if (res.kind === "link" && res.url) {
      window.open(res.url, "_blank", "noopener,noreferrer");
      return;
    }
    const href = routeFor(res);
    if (href) router.push(href);
  };

  const highlightedQuery = useMemo(() => query.trim(), [query]);

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : null}
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setOpen(true);
          } else {
            closeModal(true);
          }
        }}
      >
        <DialogContent className="p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false} className="relative">
            <button
              type="button"
              onClick={() => {
                closeModal(true);
              }}
              className="absolute right-3 top-3 z-10 rounded-md p-1 text-muted-foreground transition hover:bg-muted"
              aria-label="Close search"
            >
              <X className="h-4 w-4" />
            </button>
            <CommandInput
              autoFocus
              placeholder='Search anything (dates like "dec 12" or "2025-12-12")'
              value={query}
              onValueChange={(val) => {
                setQuery(val);
                if (!val.trim()) setResults([]);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeModal(true);
                }
              }}
              className="h-12 pr-10 text-base"
            />
            <CommandList className="max-h-80 overflow-y-auto">
              <CommandEmpty>
                {isLoading ? "Searching..." : query.trim() ? "No results." : "Type to search."}
              </CommandEmpty>
              {results.map((res) => (
                <CommandItem
                  key={`${res.kind}-${res.id}`}
                  value={res.title}
                  onSelect={() => handleSelect(res)}
                  className="flex flex-col items-start gap-1"
                >
                  <div className="flex w-full items-center gap-2">
                    <Badge className={cn(kindBadge(res.kind), "capitalize")}>{res.kind}</Badge>
                    <Highlighted text={res.title} query={highlightedQuery} className="truncate text-sm font-semibold text-foreground" />
                  </div>
                  {res.content ? (
                    <Highlighted
                      text={res.content}
                      query={highlightedQuery}
                      className="w-full truncate text-xs text-muted-foreground"
                    />
                  ) : null}
                  <div className="flex w-full items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{res.source}</span>
                    {res.url ? (
                      <Highlighted text={res.url} query={highlightedQuery} className="truncate text-primary" />
                    ) : null}
                    {res.category ? <Badge variant="outline">{res.category}</Badge> : null}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function routeFor(result: SearchResult): string {
  switch (result.kind) {
    case "task":
      return "/tasks";
    case "note":
      return "/notes";
    case "subscription":
    case "finance":
      return "/finances";
    case "timer":
      return "/timers";
    case "link":
      return result.url || "/bookmarks";
    default:
      return "/";
  }
}

function kindBadge(kind: string) {
  switch (kind) {
    case "task":
      return "bg-primary text-primary-foreground";
    case "note":
      return "bg-secondary text-secondary-foreground";
    case "link":
      return "bg-muted text-foreground";
    case "subscription":
    case "finance":
      return "bg-amber-200 text-amber-900 dark:bg-amber-300/70 dark:text-amber-950";
    case "timer":
      return "bg-sky-200 text-sky-900 dark:bg-sky-300/70 dark:text-sky-950";
    default:
      return "bg-muted text-foreground";
  }
}

function Highlighted({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  if (!query.trim()) return <span className={className}>{text}</span>;
  const escaped = escapeRegex(query.trim());
  const regex = new RegExp(`(${escaped})`, "ig");
  const parts = text.split(regex);
  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (!part) return null;
        const isMatch = part.toLowerCase() === query.trim().toLowerCase();
        return isMatch ? (
          <mark
            key={idx}
            className="rounded bg-amber-200 px-0.5 text-foreground dark:bg-amber-400/40"
          >
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        );
      })}
    </span>
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
