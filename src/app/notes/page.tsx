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

export default async function NotesPage() {
  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
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
          <Textarea name="content" placeholder="Body" required />
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
        description="Notes with a title and body for quick edits."
        actions={NoteAddModal}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: { id: number; title: string; content: string; updatedAt: Date } }) {
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
            <p className="text-sm text-muted-foreground line-clamp-4">
              {note.content}
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
          <Textarea name="content" defaultValue={note.content} required />
          <DialogClose asChild>
            <Button type="submit">Save changes</Button>
          </DialogClose>
        </form>
      </DialogContent>
    </Dialog>
  );
}
