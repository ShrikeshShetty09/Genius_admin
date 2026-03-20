import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mediaId = Number(id);

  if (!mediaId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await query("DELETE FROM activity_media WHERE id=$1", [mediaId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
