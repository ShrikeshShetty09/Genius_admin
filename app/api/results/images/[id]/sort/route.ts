import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const imageId = parseInt(id, 10);

  if (isNaN(imageId)) {
    return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    direction?: "up" | "down";
  } | null;

  const direction = body?.direction;

  if (!direction) {
    return NextResponse.json({ error: "Direction is required" }, { status: 400 });
  }

  try {
    // Get all images ordered by sort_order
    const allImages = await query<{ id: number; sort_order: number }>(
      "SELECT id, sort_order FROM result_images ORDER BY sort_order ASC, id ASC"
    );

    const images = allImages.rows;
    const currentIndex = images.findIndex((img) => img.id === imageId);

    if (currentIndex === -1) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= images.length) {
      return NextResponse.json({ error: "Cannot move in that direction" }, { status: 400 });
    }

    const currentImage = images[currentIndex];
    const targetImage = images[targetIndex];

    // Swap sort_order values
    await query(
      "UPDATE result_images SET sort_order = $1 WHERE id = $2",
      [targetImage.sort_order, currentImage.id]
    );
    await query(
      "UPDATE result_images SET sort_order = $1 WHERE id = $2",
      [currentImage.sort_order, targetImage.id]
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to reorder image" }, { status: 500 });
  }
}
