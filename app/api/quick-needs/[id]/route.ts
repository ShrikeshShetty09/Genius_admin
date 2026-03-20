import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await query("DELETE FROM quick_needs WHERE id = $1", [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete quick need" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { is_active?: boolean } | null;

  if (!body || body.is_active === undefined) {
    return NextResponse.json({ error: "Missing is_active" }, { status: 400 });
  }

  try {
    await query("UPDATE quick_needs SET is_active = $1 WHERE id = $2", [body.is_active, id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update quick need" }, { status: 500 });
  }
}
