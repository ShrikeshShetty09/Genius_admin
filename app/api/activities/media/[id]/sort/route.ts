import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = Number(id);

  if (!mediaId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    direction?: "up" | "down";
  } | null;

  const direction = body?.direction;
  if (!direction) {
    return NextResponse.json({ error: "Direction is required" }, { status: 400 });
  }

  try {
    const currentRes = await query<{ activity_id: number }>(
      "SELECT activity_id FROM activity_media WHERE id = $1",
      [mediaId]
    );
    const activityId = currentRes.rows[0]?.activity_id;
    if (!activityId) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const allRes = await query<{ id: number; sort_order: number }>(
      "SELECT id, sort_order FROM activity_media WHERE activity_id = $1 ORDER BY sort_order ASC, id ASC",
      [activityId]
    );

    const rows = allRes.rows;
    const currentIndex = rows.findIndex((r) => r.id === mediaId);
    if (currentIndex === -1) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) {
      return NextResponse.json({ error: "Cannot move in that direction" }, { status: 400 });
    }

    const current = rows[currentIndex];
    const target = rows[targetIndex];

    await query("UPDATE activity_media SET sort_order = $1 WHERE id = $2", [target.sort_order, current.id]);
    await query("UPDATE activity_media SET sort_order = $1 WHERE id = $2", [current.sort_order, target.id]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to reorder media" }, { status: 500 });
  }
}
