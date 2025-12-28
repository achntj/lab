"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  Link as LinkIcon,
  Image as ImageIcon,
  Home,
  Bell,
  StickyNote,
  Timer,
  Wallet,
  Search,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/search/search-modal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  description?: string;
};

export const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home, description: "Overview" },
  { label: "Board", href: "/board", icon: ImageIcon, description: "Vision" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, description: "Todos" },
  { label: "Notes", href: "/notes", icon: StickyNote, description: "Pages" },
  {
    label: "Bookmarks",
    href: "/bookmarks",
    icon: LinkIcon,
    description: "Links",
  },
  { label: "Reminders", href: "/reminders", icon: Bell, description: "Queue" },
  { label: "Timers", href: "/timers", icon: Timer, description: "Sessions" },
  {
    label: "Finances",
    href: "/finances",
    icon: Wallet,
    description: "Subscriptions",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Hotkeys",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r bg-card/40 px-4 py-6 md:flex">
      <div className="flex items-center justify-between px-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Personal Lab
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Desktop workspace for tasks, notes, and more.
          </p>
        </div>
        <SearchModal
          trigger={
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground transition hover:bg-muted"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          }
        />
      </div>
      <Separator className="my-5" />
      <ScrollArea className="flex-1">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-muted hover:text-foreground dark:hover:bg-muted/70 border border-transparent",
                  active
                    ? "bg-primary/10 text-primary-foreground/80 shadow-sm border-primary/40"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-md bg-muted text-muted-foreground",
                    active && "bg-primary text-primary-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex flex-1 flex-col">
                  <span className={cn("font-medium", active && "text-foreground")}>
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="mt-4 rounded-lg border bg-muted/50 px-3 py-3 text-xs text-muted-foreground">
        Press <span className="font-semibold text-foreground">⌘K</span> (configurable)
        to open the command palette anywhere.
      </div>
    </aside>
  );
}
