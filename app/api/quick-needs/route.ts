import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await query(
      "SELECT id, type, content, media_url, start_date, end_date, is_active, created_at FROM quick_needs ORDER BY created_at DESC"
    );
    return NextResponse.json({ items: result.rows });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    type?: "tagline" | "image" | "video";
    content?: string;
    media_url?: string;
    start_date?: string;
    end_date?: string;
  } | null;

  if (!body || !body.type || !body.start_date || !body.end_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (body.type === "tagline" && !body.content) {
    return NextResponse.json({ error: "Tagline content is required" }, { status: 400 });
  }

  if ((body.type === "image" || body.type === "video") && !body.media_url) {
    return NextResponse.json({ error: "Media URL is required" }, { status: 400 });
  }

  try {
    const result = await query<{ id: number }>(
      `INSERT INTO quick_needs (type, content, media_url, start_date, end_date, is_active) 
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
      [body.type, body.content || null, body.media_url || null, body.start_date, body.end_date]
    );

    return NextResponse.json({ id: result.rows[0]?.id });
  } catch {
    return NextResponse.json({ error: "Failed to create quick need" }, { status: 500 });
  }
}
