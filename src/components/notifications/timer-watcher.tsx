"use client";

import { useEffect, useRef } from "react";

import { useNotifications } from "@/components/notifications/notification-provider";

type AlertResponse = {
  timers: { id: number; label: string; endsAt: string | null }[];
};

type ReminderResponse = {
  reminders: { id: number; title: string; message: string; triggerAt: string }[];
};

export function TimerWatcher() {
  const { notify } = useNotifications();
  const notifiedTimers = useRef<Map<number, string>>(new Map());
  const notifiedReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const [alertRes, reminderRes] = await Promise.all([
          fetch("/api/alerts"),
          fetch("/api/reminders"),
        ]);
        if (!mounted) return;
        if (alertRes.ok) {
          const data = (await alertRes.json()) as AlertResponse;
          const now = Date.now();

          data.timers.forEach((timer) => {
            const endsAtIso = timer.endsAt ? new Date(timer.endsAt).toISOString() : null;
            const last = notifiedTimers.current.get(timer.id);

            if (last && last !== endsAtIso) {
              notifiedTimers.current.delete(timer.id);
            }

            if (!timer.endsAt) return;
            const endsAt = new Date(timer.endsAt).getTime();
            if (endsAt <= now && endsAtIso && notifiedTimers.current.get(timer.id) !== endsAtIso) {
              notify({ title: "Timer finished", message: `${timer.label} completed` });
              notifiedTimers.current.set(timer.id, endsAtIso);
            }
          });
        }

        if (reminderRes.ok) {
          const data = (await reminderRes.json()) as ReminderResponse;
          data.reminders.forEach((reminder) => {
            const key = `${reminder.id}-${reminder.triggerAt}`;
            if (notifiedReminders.current.has(key)) return;
            notify({ title: reminder.title, message: reminder.message, sticky: true });
            notifiedReminders.current.add(key);
          });
        }
      } catch {
        /* silent */
      }
    };

    const interval = setInterval(run, 5000);
    run();
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [notify]);

  return null;
}
