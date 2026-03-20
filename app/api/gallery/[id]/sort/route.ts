import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { direction?: "up" | "down" } | null;

  if (!body || !body.direction) {
    return NextResponse.json({ error: "Missing direction" }, { status: 400 });
  }

  try {
    // Get current item
    const currentRes = await query<{ id: number; sort_order: number }>(
      "SELECT id, sort_order FROM gallery WHERE id = $1",
      [id]
    );
    const current = currentRes.rows[0];
    if (!current) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Get all items sorted by sort_order
    const allRes = await query<{ id: number; sort_order: number }>(
      "SELECT id, sort_order FROM gallery ORDER BY sort_order ASC, id ASC"
    );
    const all = allRes.rows;
    const currentIndex = all.findIndex((i) => i.id === current.id);

    if (currentIndex === -1) {
      return NextResponse.json({ error: "Item not found in list" }, { status: 404 });
    }

    const swapIndex = body.direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= all.length) {
      return NextResponse.json({ error: "Cannot move in that direction" }, { status: 400 });
    }

    const swapItem = all[swapIndex];

    // Swap sort_order values
    await query("UPDATE gallery SET sort_order = $1 WHERE id = $2", [current.sort_order, swapItem.id]);
    await query("UPDATE gallery SET sort_order = $1 WHERE id = $2", [swapItem.sort_order, current.id]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to reorder item" }, { status: 500 });
  }
}
