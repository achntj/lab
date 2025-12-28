import { createNote } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { NotesGrid, type NoteWithLinks } from "@/components/notes/notes-grid";
import { NoteMarkdownTextarea } from "@/components/notes/note-markdown-textarea";
import { NoteTitleInput } from "@/components/notes/note-title-input";

type LinkMeta = { title: string; kind: string; noteId?: number | null };
type NoteLinks = { outgoing: LinkMeta[]; backlinks: LinkMeta[] };

export default async function NotesPage() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  const noteTitleRows = await prisma.note.findMany({
    select: { title: true },
    orderBy: { title: "asc" },
  });
  const noteTitles = noteTitleRows.map((note) => note.title);

  const noteIds = notes.map((note) => String(note.id));
  const noteRecords = noteIds.length
    ? await prisma.record.findMany({
        where: { source: "note", sourceId: { in: noteIds } },
      })
    : [];

  const recordIdToNoteId = new Map<number, number>(
    noteRecords.map((record) => [record.id, Number(record.sourceId)]),
  );
  const noteRecordIds = noteRecords.map((record) => record.id);

  const links = noteRecordIds.length
    ? await prisma.recordLink.findMany({
        where: {
          OR: [{ sourceId: { in: noteRecordIds } }, { targetId: { in: noteRecordIds } }],
        },
        include: { source: true, target: true },
      })
    : [];

  const noteLinks = new Map<number, NoteLinks>();
  const bucket = (noteId: number) => {
    if (!noteLinks.has(noteId)) {
      noteLinks.set(noteId, { outgoing: [], backlinks: [] });
    }
    return noteLinks.get(noteId)!;
  };

  links.forEach((link) => {
    const sourceNoteId = recordIdToNoteId.get(link.sourceId);
    if (sourceNoteId) {
      bucket(sourceNoteId).outgoing.push({
        title: link.target.title,
        kind: link.target.kind,
        noteId: recordIdToNoteId.get(link.targetId) ?? null,
      });
    }
    const targetNoteId = recordIdToNoteId.get(link.targetId);
    if (targetNoteId) {
      bucket(targetNoteId).backlinks.push({
        title: link.source.title,
        kind: link.source.kind,
        noteId: recordIdToNoteId.get(link.sourceId) ?? null,
      });
    }
  });

  const titleToId = Object.fromEntries(notes.map((note) => [note.title, note.id]));

  const gridData: NoteWithLinks[] = notes.map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    updatedAt: note.updatedAt.toISOString(),
    links: noteLinks.get(note.id)?.outgoing ?? [],
    backlinks: noteLinks.get(note.id)?.backlinks ?? [],
  }));

  const NoteComposer = (
    <Card id="new-note" className="border-dashed scroll-mt-24">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">New note</CardTitle>
        <CardDescription>
          Capture quick thoughts, format in Markdown, and weave in [[mentions]] without leaving this page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createNote} className="space-y-3">
          <NoteTitleInput name="title" placeholder="Give it a friendly title" required className="bg-muted/30" />
          <NoteMarkdownTextarea
            noteTitles={noteTitles}
            name="content"
            placeholder="Write freely — supports Markdown, inline links, and [[note mentions]]."
            required
            rows={8}
            className="min-h-[150px] bg-muted/30"
          />
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Markdown hints
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Use # for headings and - for lists to structure ideas.</li>
              <li>Type [[Title]] to link notes, or add [links](https://example.com).</li>
              <li>Keep notes short and scannable; edit later in the detail view.</li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Tip: start with a title and one sentence, then refine later.
            </p>
            <Button type="submit">Save note</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="A cozy place to write in rich Markdown, link thoughts together, and revisit them quickly."
        actions={
          <Button asChild size="sm">
            <a href="#new-note">New note</a>
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="space-y-4">{NoteComposer}</div>
        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Recent notes</h2>
              <p className="text-sm text-muted-foreground">
                {notes.length
                  ? `Showing ${notes.length} most recently updated notes.`
                  : "No notes yet. Start with a new note to see it here."}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Sorted by last updated</p>
          </div>
          <NotesGrid notes={gridData} titleToId={titleToId} noteTitles={noteTitles} />
        </div>
      </div>
    </div>
  );
}
