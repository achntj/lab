import type { Metadata } from "next";
import "./globals.css";

import { CommandMenu } from "@/components/command-menu";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { TimerWatcher } from "@/components/notifications/timer-watcher";
import { HotkeyProvider } from "@/components/hotkeys/hotkey-provider";
import { LockGate } from "@/components/lock/lock-gate";
import { LockProvider } from "@/components/lock/lock-provider";
import { DeviceVerificationGate } from "@/components/lock/device-verification-gate";
import { LockedPlaceholder } from "@/components/lock/locked-placeholder";
import { LockButton } from "@/components/lock/lock-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { SearchModal } from "@/components/search/search-modal";
import { Button } from "@/components/ui/button";
import { SoftDate } from "@/components/soft-date";
import { getLockDeviceId } from "@/lib/lock-device";
import { getLockState } from "@/lib/lock-state";
import { isDeviceVerified } from "@/lib/lock-verification";

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

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const deviceId = await getLockDeviceId();
  const lockState = await getLockState(deviceId);
  const isLocked = lockState.enabled && lockState.locked;
  const isVerified = await isDeviceVerified(deviceId);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
        )}
      >
        <HotkeyProvider>
          <NotificationProvider>
            <LockProvider initialLocked={isLocked} initialVerified={isVerified}>
              <div className="relative flex min-h-screen overflow-hidden">
                <div className="ambient-blobs" aria-hidden />
                <DeviceVerificationGate initialVerified={isVerified}>
                  {isLocked ? (
                    <div className="cozy-shell flex min-h-screen min-w-0 flex-1 flex-col">
                      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
                        <LockedPlaceholder />
                      </main>
                    </div>
                  ) : (
                    <LockGate>
                      <Sidebar />
                      <div className="cozy-shell flex min-h-screen min-w-0 flex-1 flex-col">
                        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:px-6">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground md:hidden">
                            <MobileNav />
                            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                              Personal Lab
                            </span>
                          </div>
                          <div className="flex flex-1 items-center justify-end gap-3">
                            <SoftDate className="hidden md:flex" />
                            <div className="flex items-center gap-2">
                              <SearchModal
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hidden sm:inline-flex"
                                  >
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
                              <LockButton />
                              <ThemeToggle />
                            </div>
                          </div>
                        </header>
                        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
                      </div>
                      <TimerWatcher />
                    </LockGate>
                  )}
                </DeviceVerificationGate>
              </div>
            </LockProvider>
          </NotificationProvider>
        </HotkeyProvider>
      </body>
    </html>
  );
}
