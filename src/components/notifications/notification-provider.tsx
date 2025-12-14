"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type Notification = {
  id: number;
  title: string;
  message: string;
  sticky?: boolean;
};

type NotificationContextValue = {
  notify: (input: { title: string; message: string; sticky?: boolean }) => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (input: { title: string; message: string; sticky?: boolean }) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, ...input }]);
    if (!input.sticky) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    }
  };

  const value = useMemo(() => ({ notify }), []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-80 flex-col gap-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto rounded-lg border bg-card px-4 py-3 shadow-lg shadow-black/10"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
              </div>
              <button
                type="button"
                className={cn(
                  "rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground",
                )}
                onClick={() =>
                  setNotifications((prev) => prev.filter((existing) => existing.id !== n.id))
                }
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
