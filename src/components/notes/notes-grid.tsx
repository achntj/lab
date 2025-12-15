"use client";

import { useMemo, useState, useTransition } from "react";

import { updateNote } from "@/app/actions";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type NoteLink = { title: string; kind: string; noteId?: number | null };

export type NoteWithLinks = {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
  links: NoteLink[];
  backlinks: NoteLink[];
};

type NotesGridProps = {
  notes: NoteWithLinks[];
  titleToId: Record<string, number>;
};

export function NotesGrid({ notes, titleToId }: NotesGridProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { title: string; content: string }>>(() =>
    Object.fromEntries(notes.map((note) => [note.id, { title: note.title, content: note.content }])),
  );
  const [isSaving, startTransition] = useTransition();

  const notesById = useMemo(() => Object.fromEntries(notes.map((n) => [n.id, n])), [notes]);

  const openNote = (id: number | null) => {
    setOpenId(id);
  };

  const handleLinkNavigate = (payload: { href?: string; title?: string }) => {
    const targetTitle = payload.title?.trim();
    if (!targetTitle) return false;
    const idFromMap = titleToId[targetTitle];
    if (idFromMap) {
      openNote(idFromMap);
      return true;
    }
    // If href is a number or contains note id directly, try that
    if (payload.href) {
      const matchId = payload.href.match(/note=(\d+)/);
      const id = matchId ? Number(matchId[1]) : Number(payload.href);
      if (!Number.isNaN(id) && notesById[id]) {
        openNote(id);
        return true;
      }
    }
    return false;
  };

  const selected = openId ? notesById[openId] : null;
  const draft = selected ? drafts[selected.id] ?? { title: selected.title, content: selected.content } : null;

  const handleDraftChange = (id: number, field: "title" | "content", value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { title: selected?.title ?? "", content: selected?.content ?? "" }), [field]: value },
    }));
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => (
          <Card
            key={note.id}
            className="flex cursor-pointer flex-col transition hover:border-primary/40 hover:shadow"
            onClick={() => openNote(note.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{note.title}</CardTitle>
                <Badge variant="secondary">Note</Badge>
              </div>
              <CardDescription>
                Updated{" "}
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                }).format(new Date(note.updatedAt))}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <MarkdownPreview
                content={note.content}
                className="text-muted-foreground"
                onLinkClick={handleLinkNavigate}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(openId)} onOpenChange={(open) => openNote(open ? openId : null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selected && draft ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
                <CardDescription>
                  Edit in place, format with Markdown, and keep linking to anything using [[mentions]].
                </CardDescription>
              </DialogHeader>
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <form
                  action={(formData) => {
                    formData.set("noteId", String(selected.id));
                    formData.set("title", draft.title);
                    formData.set("content", draft.content);
                    startTransition(async () => {
                      await updateNote(formData);
                    });
                  }}
                  className="space-y-3"
                >
                  <input type="hidden" name="noteId" value={selected.id} />
                  <Input
                    name="title"
                    value={draft.title}
                    onChange={(e) => handleDraftChange(selected.id, "title", e.target.value)}
                    required
                  />
                  <Textarea
                    name="content"
                    value={draft.content}
                    onChange={(e) => handleDraftChange(selected.id, "content", e.target.value)}
                    required
                    rows={14}
                    className="min-h-[260px]"
                    placeholder="Write freely in Markdown. Add lists, links [like this](https://example.com), and [[mentions]] to other notes or records."
                  />
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                    <DialogClose asChild>
                      <Button type="button" variant="ghost">
                        Close
                      </Button>
                    </DialogClose>
                  </div>
                </form>
                <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium text-foreground">Live preview</p>
                  <MarkdownPreview
                    content={draft.content}
                    className="text-muted-foreground"
                    onLinkClick={handleLinkNavigate}
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <LinkSection
                  title="Links"
                  items={selected.links}
                  emptyText="No links yet. Add [[Title]] inside the note body."
                  onNavigate={handleLinkNavigate}
                />
                <LinkSection
                  title="Backlinks"
                  items={selected.backlinks}
                  emptyText="Nothing links here yet."
                  onNavigate={handleLinkNavigate}
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LinkSection({
  title,
  items,
  emptyText,
  onNavigate,
}: {
  title: string;
  items: NoteLink[];
  emptyText: string;
  onNavigate: (info: { title?: string }) => boolean | void;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <button
              key={`${item.title}-${idx}`}
              type="button"
              onClick={() => onNavigate({ title: item.title })}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition",
                "border-border bg-background/60 hover:border-primary/50 hover:text-primary",
              )}
            >
              <span className="font-medium">{item.title}</span>
              <span className="text-[10px] uppercase text-muted-foreground">{item.kind}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}
