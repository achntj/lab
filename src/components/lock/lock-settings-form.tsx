"use client";

import { useState } from "react";

import { useLock } from "@/components/lock/lock-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LOCK_IDLE_MINUTES } from "@/config/lock";
import { isPinValid, PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "@/lib/lock-crypto";

export function LockSettingsForm() {
  const {
    hasPin,
    hasBiometric,
    biometricAvailable,
    setPin,
    verifyPin,
    clearPin,
    enableBiometric,
    disableBiometric,
  } = useLock();

  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetFeedback = () => {
    setError(null);
    setStatus(null);
  };

  const handlePinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    resetFeedback();
    const next = nextPin.trim();
    const confirm = confirmPin.trim();
    const current = currentPin.trim();
    if (!isPinValid(next)) {
      setError(`PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits.`);
      return;
    }
    if (next !== confirm) {
      setError("PINs do not match.");
      return;
    }
    setBusy(true);
    if (hasPin) {
      if (!current) {
        setError("Enter your current PIN.");
        setBusy(false);
        return;
      }
      const ok = await verifyPin(current);
      if (!ok) {
        setError("Current PIN is incorrect.");
        setBusy(false);
        return;
      }
    }
    try {
      await setPin(next);
      setCurrentPin("");
      setNextPin("");
      setConfirmPin("");
      setStatus(hasPin ? "PIN updated." : "PIN set.");
    } catch {
      setError("Unable to update PIN on this device.");
    }
    setBusy(false);
  };

  const handleDisable = async () => {
    resetFeedback();
    if (!hasPin) return;
    const current = currentPin.trim();
    if (!current) {
      setError("Enter your current PIN to disable the lock.");
      return;
    }
    setBusy(true);
    const ok = await verifyPin(current);
    if (!ok) {
      setError("Current PIN is incorrect.");
      setBusy(false);
      return;
    }
    clearPin();
    setCurrentPin("");
    setNextPin("");
    setConfirmPin("");
    setStatus("Lock disabled.");
    setBusy(false);
  };

  const handleEnableBiometric = async () => {
    resetFeedback();
    if (!hasPin) {
      setError("Set a PIN before enabling fingerprint unlock.");
      return;
    }
    setBusy(true);
    const result = await enableBiometric();
    if (!result.ok) {
      setError(result.error ?? "Fingerprint setup failed.");
    } else {
      setStatus("Fingerprint enabled.");
    }
    setBusy(false);
  };

  const handleDisableBiometric = () => {
    resetFeedback();
    disableBiometric();
    setStatus("Fingerprint disabled.");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground">Auto-lock</div>
        <p className="text-xs text-muted-foreground">
          Locks on fresh launch and after {LOCK_IDLE_MINUTES} minutes of inactivity. Update in{" "}
          <span className="font-mono">src/config/lock.ts</span>.
        </p>
      </div>

      <Separator />

      <form onSubmit={handlePinSubmit} className="space-y-3">
        <div className="text-sm font-semibold text-foreground">
          {hasPin ? "Update PIN" : "Set PIN"}
        </div>
        {hasPin ? (
          <Input
            type="password"
            inputMode="numeric"
            placeholder="Current PIN"
            value={currentPin}
            onChange={(event) => setCurrentPin(event.target.value)}
            disabled={busy}
            className="max-w-xs"
          />
        ) : null}
        <Input
          type="password"
          inputMode="numeric"
          placeholder="New PIN"
          value={nextPin}
          onChange={(event) => setNextPin(event.target.value)}
          disabled={busy}
          className="max-w-xs"
        />
        <Input
          type="password"
          inputMode="numeric"
          placeholder="Confirm PIN"
          value={confirmPin}
          onChange={(event) => setConfirmPin(event.target.value)}
          disabled={busy}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {hasPin ? "Update PIN" : "Set PIN"}
          </Button>
          {hasPin ? (
            <Button type="button" variant="outline" onClick={handleDisable} disabled={busy}>
              Disable lock
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          PIN is hashed locally with PBKDF2 and stored on this device. There is no recovery if you
          forget it.
        </p>
      </form>

      <Separator />

      <div className="space-y-3">
        <div className="text-sm font-semibold text-foreground">Fingerprint unlock</div>
        {!biometricAvailable && !hasBiometric ? (
          <p className="text-sm text-muted-foreground">
            Fingerprint unlock is not available on this device.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={hasBiometric ? handleDisableBiometric : handleEnableBiometric}
              variant={hasBiometric ? "outline" : "default"}
              disabled={busy}
            >
              {hasBiometric ? "Disable fingerprint" : "Enable fingerprint"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {!biometricAvailable && hasBiometric
                ? "Fingerprint is enabled but unavailable on this device."
                : hasBiometric
                  ? "Fingerprint is enabled."
                  : "Uses your system biometric prompt."}
            </span>
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}
