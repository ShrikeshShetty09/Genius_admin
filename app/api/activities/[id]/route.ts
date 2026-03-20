import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = Number(id);

  const body = (await req.json().catch(() => null)) as { name?: string; description?: string | null } | null;
  const name = body?.name?.trim();
  const description = body?.description?.trim() || null;

  if (!activityId || !name) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await query("UPDATE activities SET name=$1, description=$2 WHERE id=$3", [name, description, activityId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activityId = Number(id);

  if (!activityId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await query("DELETE FROM activity_media WHERE activity_id=$1", [activityId]);
    await query("DELETE FROM activities WHERE id=$1", [activityId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}
