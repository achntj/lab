import { NextResponse } from "next/server";

import { isLocked } from "@/lib/lock-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (await isLocked()) {
    return NextResponse.json({ error: "Locked." }, { status: 423 });
  }
  const timers = await prisma.timer.findMany({ where: { running: true } });

  return NextResponse.json({
    timers: timers.map((t) => ({
      id: t.id,
      label: t.label,
      endsAt: t.endsAt,
    })),
  });
}
