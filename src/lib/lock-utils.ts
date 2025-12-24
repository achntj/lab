export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function fromBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("Secure random generator unavailable.");
  }
  crypto.getRandomValues(bytes);
  return bytes;
}
