"use client";

import { useLock } from "@/components/lock/lock-provider";
import { LockedPlaceholder } from "@/components/lock/locked-placeholder";

type LockGateProps = {
  children: React.ReactNode;
};

export function LockGate({ children }: LockGateProps) {
  const { isLocked, hasPin } = useLock();

  if (!hasPin) return <>{children}</>;
  if (!isLocked) return <>{children}</>;

  return (
    <div className="cozy-shell flex min-h-screen flex-1 flex-col">
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <LockedPlaceholder />
      </main>
    </div>
  );
}
