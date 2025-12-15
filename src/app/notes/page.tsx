import { createNote } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { NotesGrid, type NoteWithLinks } from "@/components/notes/notes-grid";

type LinkMeta = { title: string; kind: string; noteId?: number | null };
type NoteLinks = { outgoing: LinkMeta[]; backlinks: LinkMeta[] };

export default async function NotesPage() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

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
    <Card>
      <CardHeader>
        <CardTitle>Write a warmer note</CardTitle>
        <CardDescription>
          Capture ideas in Markdown, add links, and weave in [[references]] without leaving this page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createNote} className="space-y-4">
          <Input name="title" placeholder="Give it a friendly title" required />
          <Textarea
            name="content"
            placeholder="Write freely — supports Markdown, inline links [like this](https://example.com), and [[note mentions]]."
            required
            rows={10}
            className="min-h-[180px]"
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Tip: use headings, bullet lists, code ticks, or bold/italics to shape your writing.
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
      />

      {NoteComposer}

      <NotesGrid notes={gridData} titleToId={titleToId} />
    </div>
  );
}
