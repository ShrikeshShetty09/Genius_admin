import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feedbackId = Number(id);

  const body = (await req.json().catch(() => null)) as { direction?: "up" | "down" } | null;
  const direction = body?.direction;

  if (!feedbackId || (direction !== "up" && direction !== "down")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const currentRes = await query<{ id: number; sort_order: number }>(
      "SELECT id, sort_order FROM student_feedback WHERE id=$1",
      [feedbackId]
    );
    const current = currentRes.rows[0];
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const neighborRes = await query<{ id: number; sort_order: number }>(
      direction === "up"
        ? "SELECT id, sort_order FROM student_feedback WHERE sort_order < $1 ORDER BY sort_order DESC, id DESC LIMIT 1"
        : "SELECT id, sort_order FROM student_feedback WHERE sort_order > $1 ORDER BY sort_order ASC, id ASC LIMIT 1",
      [current.sort_order]
    );

    const neighbor = neighborRes.rows[0];
    if (!neighbor) {
      return NextResponse.json({ ok: true });
    }

    await query("UPDATE student_feedback SET sort_order=$1 WHERE id=$2", [neighbor.sort_order, current.id]);
    await query("UPDATE student_feedback SET sort_order=$1 WHERE id=$2", [current.sort_order, neighbor.id]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
