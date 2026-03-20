import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const imageId = Number(id);

  if (!imageId) {
    return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
  }

  try {
    await query("DELETE FROM result_images WHERE id = $1", [imageId]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
