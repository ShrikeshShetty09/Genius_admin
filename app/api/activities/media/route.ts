import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    activityId?: number;
    type?: "image" | "youtube";
    url?: string;
    thumbnail_url?: string | null;
  } | null;

  const activityId = Number(body?.activityId);
  const type = body?.type;
  const url = body?.url?.trim();
  const thumbnailUrl = body?.thumbnail_url ?? null;

  if (!activityId || (type !== "image" && type !== "youtube") || !url) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const maxOrder = await query<{ max: number | null }>(
      "SELECT COALESCE(MAX(sort_order), 0) as max FROM activity_media WHERE activity_id = $1",
      [activityId]
    );
    const nextOrder = (maxOrder.rows[0]?.max ?? 0) + 1;

    const res = await query<{ id: number }>(
      "INSERT INTO activity_media (activity_id, type, url, thumbnail_url, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [activityId, type, url, thumbnailUrl, nextOrder]
    );

    return NextResponse.json({ id: res.rows[0]?.id });
  } catch {
    return NextResponse.json({ error: "Failed to add media" }, { status: 500 });
  }
}
