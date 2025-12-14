import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const timers = await prisma.timer.findMany({ where: { running: true } });

  return NextResponse.json({
    timers: timers.map((t) => ({
      id: t.id,
      label: t.label,
      endsAt: t.endsAt,
    })),
  });
}
