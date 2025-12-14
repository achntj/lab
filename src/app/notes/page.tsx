import { createNote, updateNote } from "@/app/actions";
import { PageHeader } from "@/components/page-header";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

type LinkMeta = { title: string; kind: string };
type NoteLinks = { outgoing: LinkMeta[]; backlinks: LinkMeta[] };

type Segment = { type: "text"; value: string } | { type: "link"; value: string };

function parseContentSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /\[\[([^[\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const [full, title] = match;
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "link", value: title.trim() });
    lastIndex = match.index + full.length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", value: content }];
}

export default async function NotesPage() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
    take: 4,
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
      });
    }
    const targetNoteId = recordIdToNoteId.get(link.targetId);
    if (targetNoteId) {
      bucket(targetNoteId).backlinks.push({
        title: link.source.title,
        kind: link.source.kind,
      });
    }
  });

  const NoteAddModal = (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="text-lg leading-none">+</span>
          New
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New note</DialogTitle>
        </DialogHeader>
        <form action={createNote} className="grid gap-3">
          <Input name="title" placeholder="Note title" required />
          <Textarea
            name="content"
            placeholder="Body (use [[Title]] to link another note, task, or record)"
            required
          />
          <DialogClose asChild>
            <Button type="submit">Save</Button>
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="Latest notes with backlinks and quick edits (showing 4 most recent)."
        actions={NoteAddModal}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} links={noteLinks.get(note.id)} />
        ))}
      </div>
    </div>
  );
}

function NoteCard({
  note,
  links,
}: {
  note: { id: number; title: string; content: string; updatedAt: Date };
  links?: NoteLinks;
}) {
  const linkData = links ?? { outgoing: [], backlinks: [] };

  const LinkSection = ({
    title,
    items,
    emptyText,
  }: {
    title: string;
    items: LinkMeta[];
    emptyText: string;
  }) => (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <Badge key={`${item.title}-${idx}`} variant="outline" className="flex gap-1">
              <span className="font-medium">{item.title}</span>
              <span className="text-[10px] uppercase text-muted-foreground">{item.kind}</span>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="flex cursor-pointer flex-col transition hover:shadow">
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
              }).format(note.updatedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground line-clamp-4 break-words">
              {parseContentSegments(note.content).map((segment, idx) =>
                segment.type === "text" ? (
                  <span key={`text-${idx}`}>{segment.value}</span>
                ) : (
                  <span
                    key={`link-${idx}`}
                    className="mx-1 inline-flex items-center gap-1 rounded-md border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground align-baseline"
                  >
                    <span>{segment.value}</span>
                  </span>
                ),
              )}
            </p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
        </DialogHeader>
        <form action={updateNote} className="grid gap-3">
          <input type="hidden" name="noteId" value={note.id} />
          <Input name="title" defaultValue={note.title} required />
          <Textarea
            name="content"
            defaultValue={note.content}
            required
            placeholder="Use [[Title]] to link another note, task, or record"
          />
          <DialogClose asChild>
            <Button type="submit">Save changes</Button>
          </DialogClose>
        </form>
        <div className="space-y-2">
          <LinkSection
            title="Links"
            items={linkData.outgoing}
            emptyText="No links yet. Add [[Title]] inside the note body."
          />
          <LinkSection
            title="Backlinks"
            items={linkData.backlinks}
            emptyText="Nothing links here yet."
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
