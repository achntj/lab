import { NextResponse } from "next/server";

import { isLocked } from "@/lib/lock-guard";
import { fetchDueReminders } from "@/lib/reminders";

export async function GET() {
  if (await isLocked()) {
    return NextResponse.json({ error: "Locked." }, { status: 423 });
  }
  const reminders = await fetchDueReminders();
  return NextResponse.json({ reminders });
}
