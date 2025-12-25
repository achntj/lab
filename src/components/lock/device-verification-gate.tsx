"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useLock } from "@/components/lock/lock-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { isPinValid, PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "@/lib/lock-crypto";

type DeviceVerificationGateProps = {
  initialVerified: boolean;
  children: React.ReactNode;
};

type Step = "verify" | "setup";

export function DeviceVerificationGate({ initialVerified, children }: DeviceVerificationGateProps) {
  const router = useRouter();
  const { setPin, enableBiometric, hasPin, hasBiometric, biometricAvailable } = useLock();
  const [step, setStep] = useState<Step>("verify");
  const [passphrase, setPassphrase] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (initialVerified) {
    return <>{children}</>;
  }

  const canUseBiometric = biometricAvailable;

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setStatus(null);
    if (!passphrase) {
      setError("Enter the verification passphrase.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/lock/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Passphrase is incorrect.");
      }
      setStep("setup");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to verify with passphrase.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handlePinSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    const next = nextPin.trim();
    const confirm = confirmPin.trim();
    if (!isPinValid(next)) {
      setError(`PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits.`);
      return;
    }
    if (next !== confirm) {
      setError("PINs do not match.");
      return;
    }
    setBusy(true);
    try {
      await setPin(next);
      setNextPin("");
      setConfirmPin("");
      setStatus("PIN set.");
    } catch {
      setError("Unable to set PIN on this device.");
    } finally {
      setBusy(false);
    }
  };

  const handleEnableBiometric = async () => {
    setError(null);
    setStatus(null);
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

  const handleContinue = async () => {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const persist = hasPin || hasBiometric;
      const payload = passphrase ? { persist, passphrase } : { persist };
      const res = await fetch("/api/lock/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Unable to verify this device.");
      }
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to verify this device.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  if (step === "verify") {
    return (
      <div className="cozy-shell flex min-h-screen flex-1 flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-10 md:px-8">
          <Card className="w-full max-w-lg border-border/70 bg-card/95 shadow-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl">Verify this device</CardTitle>
              <CardDescription>
                Enter your verification passphrase before we show your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleVerify} className="space-y-3">
                <Input
                  type="password"
                  placeholder="Verification passphrase"
                  value={passphrase}
                  onChange={(event) => {
                    setPassphrase(event.target.value);
                    if (error) setError(null);
                  }}
                  disabled={busy}
                />
                <Button type="submit" disabled={busy || !passphrase}>
                  Verify passphrase
                </Button>
              </form>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="cozy-shell flex min-h-screen flex-1 flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-10 md:px-8">
        <Card className="w-full max-w-lg border-border/70 bg-card/95 shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Secure this device</CardTitle>
            <CardDescription>
              Set a PIN to protect your data. You can enable fingerprint unlock after setting a
              PIN. Skip it and we will ask for your passphrase again next time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasPin ? (
              <p className="text-sm text-muted-foreground">PIN already set for this device.</p>
            ) : (
              <form onSubmit={handlePinSubmit} className="space-y-3">
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="New PIN"
                  value={nextPin}
                  onChange={(event) => {
                    setNextPin(event.target.value);
                    if (error) setError(null);
                  }}
                  disabled={busy}
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  placeholder="Confirm PIN"
                  value={confirmPin}
                  onChange={(event) => {
                    setConfirmPin(event.target.value);
                    if (error) setError(null);
                  }}
                  disabled={busy}
                />
                <Button type="submit" disabled={busy}>
                  Set PIN
                </Button>
                <p className="text-xs text-muted-foreground">
                  PIN must be {PIN_MIN_LENGTH}-{PIN_MAX_LENGTH} digits and is stored only on this
                  device.
                </p>
              </form>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="text-sm font-semibold text-foreground">Fingerprint unlock</div>
              {canUseBiometric ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleEnableBiometric}
                    variant={hasBiometric ? "outline" : "default"}
                    disabled={busy || hasBiometric}
                  >
                    {hasBiometric ? "Fingerprint enabled" : "Enable fingerprint"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Uses your system biometric prompt.
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Fingerprint unlock is not available on this device.
                </p>
              )}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
          </CardContent>
          <CardFooter className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleContinue} disabled={busy}>
              Continue to app
            </Button>
            {!hasPin ? (
              <span className="text-xs text-muted-foreground">You can add a PIN in Settings.</span>
            ) : null}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
