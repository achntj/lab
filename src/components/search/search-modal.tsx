"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

import { useHotkey } from "@/components/hotkeys/hotkey-provider";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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

export function triggerSearchModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SEARCH_MODAL_EVENT));
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
      return "bg-amber-100 text-amber-900";
    case "finance":
      return "bg-emerald-100 text-emerald-900";
    case "timer":
      return "bg-sky-100 text-sky-900";
    default:
      return "bg-muted text-foreground";
  }
}

function resultHref(result: SearchResult): string {
  switch (result.kind) {
    case "task":
      return "/tasks";
    case "note":
      return "/notes";
    case "link":
      return result.url || "/bookmarks";
    case "subscription":
    case "finance":
      return "/finances";
    case "timer":
      return "/timers";
    default:
      return "/";
  }
}

export function SearchModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  useHotkey("quickSearch", () => setOpen(true));
  useHotkey("search", () => setOpen(true));

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(SEARCH_MODAL_EVENT, handler);
    return () => window.removeEventListener(SEARCH_MODAL_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      return undefined;
    }
    const controller = new AbortController();
    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
      } catch {
        /* ignore */
      }
    };
    const t = setTimeout(fetchResults, 200);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (res: SearchResult) => {
    const href = resultHref(res);
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  };

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
          setOpen(isOpen);
          if (!isOpen) {
            setQuery("");
            setResults([]);
          }
        }}
      >
        <DialogContent className="p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false}>
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <CommandInput
                autoFocus
                placeholder='Search (supports date text like "2024-12-10")'
                value={query}
                onValueChange={(val) => {
                  setQuery(val);
                  if (!val.trim()) setResults([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }
                }}
                className="h-11 text-base"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <CommandList className="max-h-80 overflow-y-auto">
              <CommandEmpty>No results.</CommandEmpty>
              {results.map((res) => (
                <CommandItem
                  key={`${res.kind}-${res.id}`}
                  value={res.title}
                  onSelect={() => handleSelect(res)}
                  className="flex flex-col items-start gap-1"
                >
                  <div className="flex w-full items-center gap-2">
                    <Badge className={cn(kindBadge(res.kind), "capitalize")}>{res.kind}</Badge>
                    <p className="truncate text-sm font-semibold text-foreground">{res.title}</p>
                  </div>
                  {res.content ? (
                    <p className="w-full truncate text-xs text-muted-foreground">{res.content}</p>
                  ) : null}
                  <div className="flex w-full items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{res.source}</span>
                    {res.url ? (
                      <span className="truncate text-primary">{res.url}</span>
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
