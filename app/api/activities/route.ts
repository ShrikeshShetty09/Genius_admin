import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const activities = await query<{ id: number; name: string; description: string | null; created_at: string; sort_order: number }>(
      "SELECT id, name, description, created_at, sort_order FROM activities ORDER BY sort_order ASC, id ASC"
    );

    const media = await query<{ id: number; activity_id: number; type: "image" | "youtube"; url: string; thumbnail_url: string | null; sort_order: number }>(
      "SELECT id, activity_id, type, url, thumbnail_url, sort_order FROM activity_media ORDER BY activity_id ASC, sort_order ASC, id ASC"
    );

    const mediaByActivity = new Map<
      number,
      { id: number; type: "image" | "youtube"; url: string; thumbnail_url: string | null; sort_order: number }[]
    >();
    for (const m of media.rows) {
      const arr = mediaByActivity.get(m.activity_id) || [];
      arr.push({ id: m.id, type: m.type, url: m.url, thumbnail_url: m.thumbnail_url, sort_order: m.sort_order });
      mediaByActivity.set(m.activity_id, arr);
    }

    const payload = activities.rows.map((a) => ({
      ...a,
      media: mediaByActivity.get(a.id) || [],
    }));

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: string; description?: string | null } | null;

  const name = body?.name?.trim();
  const description = body?.description?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const maxOrder = await query<{ max: number | null }>(
      "SELECT COALESCE(MAX(sort_order), 0) as max FROM activities"
    );
    const nextOrder = (maxOrder.rows[0]?.max ?? 0) + 1;

    const res = await query<{ id: number }>(
      "INSERT INTO activities (name, description, sort_order) VALUES ($1, $2, $3) RETURNING id",
      [name, description, nextOrder]
    );

    return NextResponse.json({ id: res.rows[0]?.id });
  } catch {
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
