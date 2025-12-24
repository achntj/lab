import { fromBase64, randomBytes, toBase64 } from "@/lib/lock-utils";

const RP_NAME = "Personal Lab";
const USER_NAME = "Personal Lab";

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof PublicKeyCredential !== "undefined" &&
    !!navigator.credentials
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function createBiometricCredential(): Promise<string> {
  if (!isWebAuthnSupported()) {
    throw new Error("Biometrics are not supported on this device.");
  }
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomBytes(32),
    rp: {
      name: RP_NAME,
    },
    user: {
      id: randomBytes(16),
      name: USER_NAME,
      displayName: USER_NAME,
    },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60_000,
    attestation: "none",
  };

  const credential = await navigator.credentials.create({ publicKey });

  if (!credential || credential.type !== "public-key") {
    throw new Error("Fingerprint setup was canceled.");
  }

  const publicCredential = credential as PublicKeyCredential;
  return toBase64(new Uint8Array(publicCredential.rawId));
}

export async function requestBiometricAssertion(credentialId: string): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: randomBytes(32),
    allowCredentials: [
      {
        type: "public-key",
        id: fromBase64(credentialId),
      },
    ],
    userVerification: "required",
    timeout: 60_000,
  };

  try {
    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } catch {
    return false;
  }
}
