import { NextResponse } from "next/server";

import { isLocked } from "@/lib/lock-guard";
import { exportAllData } from "@/lib/export";

export async function GET() {
  if (await isLocked()) {
    return NextResponse.json({ error: "Locked." }, { status: 423 });
  }
  const payload = await exportAllData();
  const body = JSON.stringify(payload, null, 2);
  const safeTimestamp = payload.generatedAt.replace(/[:.]/g, "-");

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="lab-export-${safeTimestamp}.json"`,
      "cache-control": "no-store",
    },
  });
}
