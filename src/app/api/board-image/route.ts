import { NextResponse } from "next/server";

import { getBoardImageFile } from "@/lib/board-image";

export const dynamic = "force-dynamic";

export async function GET() {
  const boardImage = await getBoardImageFile();
  if (!boardImage) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(boardImage.buffer, {
    status: 200,
    headers: {
      "content-type": boardImage.contentType,
      "cache-control": "no-store",
    },
  });
}
