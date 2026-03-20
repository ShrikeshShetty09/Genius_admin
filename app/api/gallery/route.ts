import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await query(
      "SELECT id, type, url, thumbnail, sort_order FROM gallery ORDER BY sort_order ASC, id DESC"
    );
    return NextResponse.json({ items: result.rows });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    type?: "image" | "video";
    url?: string;
    thumbnail?: string;
  } | null;

  if (!body || !body.type || !body.url) {
    return NextResponse.json({ error: "Missing type or url" }, { status: 400 });
  }

  try {
    // Get max sort_order
    const maxRes = await query<{ max: number }>(
      "SELECT COALESCE(MAX(sort_order), 0) as max FROM gallery"
    );
    const nextSort = (maxRes.rows[0]?.max ?? 0) + 1;

    const result = await query<{ id: number }>(
      "INSERT INTO gallery (type, url, thumbnail, sort_order) VALUES ($1, $2, $3, $4) RETURNING id",
      [body.type, body.url, body.thumbnail || null, nextSort]
    );

    return NextResponse.json({ id: result.rows[0]?.id });
  } catch {
    return NextResponse.json({ error: "Failed to create gallery item" }, { status: 500 });
  }
}
