import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const activityId = Number(id);

  if (!activityId) {
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
    const allRes = await query<{ id: number; sort_order: number }>(
      "SELECT id, sort_order FROM activities ORDER BY sort_order ASC, id ASC"
    );

    const rows = allRes.rows;
    const currentIndex = rows.findIndex((r) => r.id === activityId);
    if (currentIndex === -1) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rows.length) {
      return NextResponse.json({ error: "Cannot move in that direction" }, { status: 400 });
    }

    const current = rows[currentIndex];
    const target = rows[targetIndex];

    await query("UPDATE activities SET sort_order = $1 WHERE id = $2", [target.sort_order, current.id]);
    await query("UPDATE activities SET sort_order = $1 WHERE id = $2", [current.sort_order, target.id]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to reorder activity" }, { status: 500 });
  }
}
