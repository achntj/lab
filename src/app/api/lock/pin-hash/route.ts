import { NextResponse } from "next/server";
import { pbkdf2Sync } from "node:crypto";

export const runtime = "nodejs";

type PinHashPayload = {
  pin?: unknown;
  salt?: unknown;
};

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 12;
const PIN_DERIVE_ITERATIONS = 120_000;
const DERIVED_KEY_LENGTH = 32;

export async function POST(request: Request) {
  let payload: PinHashPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof payload.pin !== "string" || typeof payload.salt !== "string") {
    return NextResponse.json({ error: "Missing pin or salt." }, { status: 400 });
  }

  const pin = payload.pin.trim();
  if (!new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin)) {
    return NextResponse.json({ error: "Invalid PIN format." }, { status: 400 });
  }

  let saltBytes: Buffer;
  try {
    saltBytes = Buffer.from(payload.salt, "base64");
  } catch {
    return NextResponse.json({ error: "Invalid salt." }, { status: 400 });
  }

  const derived = pbkdf2Sync(pin, saltBytes, PIN_DERIVE_ITERATIONS, DERIVED_KEY_LENGTH, "sha256");
  return NextResponse.json({ hash: derived.toString("base64") });
}
