"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, SquarePen, Search } from "lucide-react";

import { navItems } from "@/components/sidebar";
import { triggerSearchModal } from "@/components/search/search-modal";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHotkey } from "@/components/hotkeys/hotkey-provider";
import { cn } from "@/lib/utils";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // close on route change
    const handleRoute = () => setOpen(false);
    window.addEventListener("popstate", handleRoute);
    return () => window.removeEventListener("popstate", handleRoute);
  }, []);

  useHotkey("commandPalette", () => setOpen((o) => !o));

  const runCommand = (callback: () => void) => {
    setOpen(false);
    callback();
  };

  return (
    <>
      <Button
        variant="outline"
        className="hidden gap-2 border-dashed text-sm text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-4 w-4" />
        Quick actions
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          ⌘K
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle>Jump anywhere</DialogTitle>
            <DialogDescription>
              Search navigation, shortcuts, or create items.
            </DialogDescription>
          </DialogHeader>
          <Command className="border-0 shadow-none">
            <CommandInput placeholder="Jump to Tasks, Notes, Finances..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      value={item.label}
                      onSelect={() => runCommand(() => router.push(item.href))}
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                      {item.description ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      ) : null}
                      <CommandShortcut>{item.href}</CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Quick Add">
                <CommandItem
                  value="New task"
                  onSelect={() => runCommand(() => router.push("/tasks"))}
                  className={cn("justify-between")}
                >
                  <div className="flex items-center gap-2">
                    <SquarePen className="h-4 w-4 text-muted-foreground" />
                    <span>New task</span>
                  </div>
                  <CommandShortcut>t</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="New note"
                  onSelect={() => runCommand(() => router.push("/notes"))}
                  className={cn("justify-between")}
                >
                  <div className="flex items-center gap-2">
                    <SquarePen className="h-4 w-4 text-muted-foreground" />
                    <span>New note</span>
                  </div>
                  <CommandShortcut>n</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="Search"
                  onSelect={() => runCommand(() => triggerSearchModal())}
                  className={cn("justify-between")}
                >
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span>Search everything</span>
                  </div>
                  <CommandShortcut>/</CommandShortcut>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
