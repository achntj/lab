import { NextResponse } from "next/server";

import { fetchDueReminders } from "@/lib/reminders";

export async function GET() {
  const reminders = await fetchDueReminders();
  return NextResponse.json({ reminders });
}
