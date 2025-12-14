"use client";

import { useEffect, useRef } from "react";

import { useNotifications } from "@/components/notifications/notification-provider";

type AlertResponse = {
  timers: { id: number; label: string; endsAt: string | null }[];
  reminders: { id: number; name: string; amount: number; renewalDate: string }[];
};

export function TimerWatcher() {
  const { notify } = useNotifications();
  const notifiedTimers = useRef<Map<number, string>>(new Map());
  const notifiedReminders = useRef<Set<number>>(new Set());

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const res = await fetch("/api/alerts");
        if (!res.ok || !mounted) return;
        const data = (await res.json()) as AlertResponse;
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

        data.reminders.forEach((sub) => {
          if (!notifiedReminders.current.has(sub.id)) {
            notify({
              title: "Renewal reminder",
              message: `${sub.name} renews soon`,
            });
            notifiedReminders.current.add(sub.id);
          }
        });
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
