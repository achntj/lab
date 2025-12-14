import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { CommandMenu } from "@/components/command-menu";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { TimerWatcher } from "@/components/notifications/timer-watcher";
import { HotkeyProvider } from "@/components/hotkeys/hotkey-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Personal Lab",
  description: "Local-first desktop workspace built with Tauri + Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          geistSans.variable,
          geistMono.variable,
          "min-h-screen bg-background font-sans text-foreground antialiased",
        )}
      >
        <HotkeyProvider>
          <NotificationProvider>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex min-h-screen flex-1 flex-col bg-muted/30">
                <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground md:hidden">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                      Personal Lab
                    </span>
                  </div>
                  <div className="flex flex-1 justify-end gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground md:hidden"
                      >
                        <a href="https://github.com/tauri-apps" target="_blank" rel="noreferrer">
                          Tauri docs
                        </a>
                      </Button>
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
