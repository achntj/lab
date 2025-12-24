import { fromBase64, randomBytes, toBase64 } from "@/lib/lock-utils";

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 12;
export const PIN_DERIVE_ITERATIONS = 120_000;

const PIN_REGEX = new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`);

export function isPinValid(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export async function createPinHash(pin: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = randomBytes(16);
  const salt = toBase64(saltBytes);
  const hash = await hashPinWithSalt(pin, salt);
  return { hash, salt };
}

export async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Secure crypto unavailable.");
  }
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBytes = fromBase64(salt);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PIN_DERIVE_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return toBase64(new Uint8Array(derivedBits));
}
