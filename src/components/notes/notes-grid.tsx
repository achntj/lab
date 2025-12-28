"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { deleteNote, updateNote } from "@/app/actions";
import { MarkdownPreview } from "@/components/markdown-preview";
import { NoteMarkdownTextarea } from "@/components/notes/note-markdown-textarea";
import { NoteTitleInput } from "@/components/notes/note-title-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  noteTitles: string[];
};

export function NotesGrid({ notes, titleToId, noteTitles }: NotesGridProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, { title: string; content: string }>>(() =>
    Object.fromEntries(notes.map((note) => [note.id, { title: note.title, content: note.content }])),
  );
  const [isSaving, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const notesById = useMemo(() => Object.fromEntries(notes.map((n) => [n.id, n])), [notes]);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
      }),
    [],
  );

  useEffect(() => {
    setIsEditing(false);
  }, [openId]);

  const openNote = (id: number | null) => {
    setOpenId(id);
  };

  const handleCardClick = (event: React.MouseEvent<HTMLDivElement>, id: number) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button")) return;
    openNote(id);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, id: number) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openNote(id);
    }
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

  const resetDraft = (note: NoteWithLinks) => {
    setDrafts((prev) => ({
      ...prev,
      [note.id]: { title: note.title, content: note.content },
    }));
  };

  const countWords = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  const displayedTitle = selected ? (isEditing ? draft?.title ?? selected.title : selected.title) : "";
  const displayedContent = selected ? drafts[selected.id]?.content ?? selected.content : "";

  if (!notes.length) {
    return (
      <Card className="border-dashed">
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">No notes yet</CardTitle>
          <CardDescription>Start a note on the left to see it show up here.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => {
          const trimmed = note.content.trim();
          const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
          const updatedLabel = dateFormatter.format(new Date(note.updatedAt));
          const hasRelations = note.links.length > 0 || note.backlinks.length > 0;

          return (
            <Card
              key={note.id}
              role="button"
              tabIndex={0}
              aria-label={`Open note ${note.title}`}
              className="group flex h-full min-w-0 cursor-pointer flex-col transition hover:border-primary/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={(event) => handleCardClick(event, note.id)}
              onKeyDown={(event) => handleCardKeyDown(event, note.id)}
            >
              <CardHeader className="space-y-2 pb-2">
                <CardTitle className="line-clamp-2 break-all text-base">
                  {note.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Updated {updatedLabel}</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                  <span>{wordCount ? `${wordCount} words` : "Empty note"}</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-w-0">
                <div className="relative max-h-40 overflow-hidden">
                  <MarkdownPreview
                    content={note.content}
                    className="space-y-1 text-sm leading-6 text-muted-foreground"
                    onLinkClick={handleLinkNavigate}
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {hasRelations ? (
                    <>
                      {note.links.length ? (
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                          {note.links.length} links
                        </Badge>
                      ) : null}
                      {note.backlinks.length ? (
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                          {note.backlinks.length} backlinks
                        </Badge>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">No links yet</span>
                  )}
                </div>
                <span className="text-xs font-medium text-primary/80 transition group-hover:text-primary">Open</span>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={Boolean(openId)}
        onOpenChange={(open) => {
          if (!open) {
            if (selected) {
              resetDraft(selected);
            }
            setIsEditing(false);
            openNote(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && draft ? (
            <>
              <DialogHeader className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <DialogTitle className="break-all text-xl">
                      {displayedTitle}
                    </DialogTitle>
                    <CardDescription>
                      Updated {dateFormatter.format(new Date(selected.updatedAt))} •{" "}
                      {countWords(isEditing ? draft.content : displayedContent)} words
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isEditing ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit note"
                        onClick={() => setIsEditing(true)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                        </svg>
                      </Button>
                    ) : null}
                    <DialogClose asChild>
                      <Button type="button" variant="ghost">
                        Close
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </DialogHeader>
              {isEditing ? (
                <form
                  action={(formData) => {
                    formData.set("noteId", String(selected.id));
                    formData.set("title", draft.title);
                    formData.set("content", draft.content);
                    startTransition(async () => {
                      await updateNote(formData);
                      setIsEditing(false);
                    });
                  }}
                  className="space-y-4"
                >
                  <input type="hidden" name="noteId" value={selected.id} />
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Title
                    </label>
                    <NoteTitleInput
                      name="title"
                      value={draft.title}
                      onChange={(e) => handleDraftChange(selected.id, "title", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Markdown
                    </label>
                    <NoteMarkdownTextarea
                      noteTitles={noteTitles}
                      name="content"
                      value={draft.content}
                      onValueChange={(nextValue) => handleDraftChange(selected.id, "content", nextValue)}
                      required
                      rows={16}
                      className="min-h-[320px]"
                      placeholder="Write freely in Markdown. Add lists, links [like this](https://example.com), and [[mentions]] to other notes or records."
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        resetDraft(selected);
                        setIsEditing(false);
                      }}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      disabled={isDeleting}
                      onClick={() => {
                        const formData = new FormData();
                        formData.set("noteId", String(selected.id));
                        startDelete(async () => {
                          await deleteNote(formData);
                          openNote(null);
                        });
                      }}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </form>
              ) : (
                <div
                  className="rounded-lg border bg-muted/20 p-4"
                  onDoubleClick={() => setIsEditing(true)}
                >
                  <MarkdownPreview
                    content={displayedContent}
                    className="space-y-2 text-base leading-7 text-foreground"
                    onLinkClick={handleLinkNavigate}
                  />
                </div>
              )}
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
              <span className="max-w-[60vw] truncate font-medium sm:max-w-[240px]">
                {item.title}
              </span>
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
