"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LockScreenProps = {
  isLocked: boolean;
  hasPin: boolean;
  hasBiometric: boolean;
  biometricAvailable: boolean;
  unlockWithPin: (pin: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
};

export function LockScreen({
  isLocked,
  hasPin,
  hasBiometric,
  biometricAvailable,
  unlockWithPin,
  unlockWithBiometric,
}: LockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoAttempted, setAutoAttempted] = useState(false);

  useEffect(() => {
    if (isLocked) {
      setPin("");
      setError(null);
      setBusy(false);
      setAutoAttempted(false);
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked || !hasBiometric || !biometricAvailable || autoAttempted) return;
    setAutoAttempted(true);
    setBusy(true);
    unlockWithBiometric()
      .then((ok) => {
        if (!ok) {
          setError("Fingerprint prompt was blocked or canceled. Try again or use your PIN.");
        }
      })
      .finally(() => {
        setBusy(false);
      });
  }, [autoAttempted, biometricAvailable, hasBiometric, isLocked, unlockWithBiometric]);

  if (!isLocked || !hasPin) return null;

  const handlePinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await unlockWithPin(pin.trim());
    if (!ok) {
      setError("Incorrect PIN. Try again.");
    }
    setBusy(false);
  };

  const handleBiometric = async () => {
    setBusy(true);
    setError(null);
    const ok = await unlockWithBiometric();
    if (!ok) {
      setError("Fingerprint failed. Use your PIN.");
    }
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-md border-border/70 bg-card/95 shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Locked
          </div>
          <CardTitle className="text-2xl">Unlock Personal Lab</CardTitle>
          <CardDescription>
            {hasBiometric && biometricAvailable
              ? "Verify with fingerprint or enter your PIN to continue."
              : "Enter your PIN to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasBiometric && biometricAvailable ? (
            <Button type="button" className="w-full" onClick={handleBiometric} disabled={busy}>
              Use fingerprint
            </Button>
          ) : null}
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(event) => {
                setPin(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter PIN"
              aria-label="PIN"
              disabled={busy}
            />
            <Button type="submit" className="w-full" disabled={busy || !pin.trim()}>
              Unlock with PIN
            </Button>
          </form>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {hasBiometric && !biometricAvailable ? (
            <p className="text-xs text-muted-foreground">
              Fingerprint unlock is unavailable on this device. Use your PIN.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
