import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { CommandMenu } from "@/components/command-menu";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { TimerWatcher } from "@/components/notifications/timer-watcher";
import { HotkeyProvider } from "@/components/hotkeys/hotkey-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { SearchModal } from "@/components/search/search-modal";
import { Button } from "@/components/ui/button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeInitScript = `
(() => {
  const key = 'personal-lab-theme';
  try {
    const stored = localStorage.getItem(key);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'dark' || stored === 'light' ? stored : (prefersDark ? 'dark' : 'light');
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
  } catch (_) {
    /* ignore */
  }
})();
`;

export const metadata: Metadata = {
  title: "Personal Lab",
  description: "Desktop workspace built with Tauri + Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "min-h-screen bg-background font-sans text-foreground antialiased",
        )}
      >
        <HotkeyProvider>
          <NotificationProvider>
            <div className="relative flex min-h-screen overflow-hidden">
              <div className="ambient-blobs" aria-hidden />
              <Sidebar />
              <div className="cozy-shell flex min-h-screen flex-1 flex-col">
                <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground md:hidden">
                    <MobileNav />
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      Personal Lab
                    </span>
                  </div>
                  <div className="flex flex-1 justify-end gap-2">
                    <div className="flex items-center gap-2">
                      <SearchModal
                        trigger={
                          <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
                            <span className="sr-only">Search</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-5 w-5 text-muted-foreground"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.3-4.3" />
                            </svg>
                          </Button>
                        }
                      />
                      <CommandMenu />
                      <ThemeToggle />
                    </div>
                  </div>
                </header>
                <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
              </div>
            </div>
            <TimerWatcher />
          </NotificationProvider>
        </HotkeyProvider>
      </body>
    </html>
  );
}
