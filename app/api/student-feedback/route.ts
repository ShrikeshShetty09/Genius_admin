import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS student_feedback (
      id SERIAL PRIMARY KEY,
      student_name VARCHAR(255) NOT NULL,
      feedback TEXT NOT NULL,
      media_type VARCHAR(50) NOT NULL,
      media_url TEXT NOT NULL,
      thumbnail_url TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    const res = await query<{
      id: number;
      student_name: string;
      feedback: string;
      media_type: "image" | "youtube";
      media_url: string;
      thumbnail_url: string | null;
      sort_order: number;
      created_at: string;
    }>(
      "SELECT id, student_name, feedback, media_type, media_url, thumbnail_url, sort_order, created_at FROM student_feedback ORDER BY sort_order ASC, id ASC"
    );

    return NextResponse.json({ items: res.rows });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    student_name?: string;
    feedback?: string;
    media_type?: "image" | "youtube";
    media_url?: string;
    thumbnail_url?: string | null;
  } | null;

  const studentName = body?.student_name?.trim();
  const feedback = body?.feedback?.trim();
  const mediaType = body?.media_type;
  const mediaUrl = body?.media_url?.trim();
  const thumbnailUrl = body?.thumbnail_url?.trim() || null;

  if (!studentName || !feedback || !mediaType || !mediaUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (mediaType !== "image" && mediaType !== "youtube") {
    return NextResponse.json({ error: "Invalid media_type" }, { status: 400 });
  }

  try {
    await ensureTable();

    const maxOrder = await query<{ max: number | null }>(
      "SELECT COALESCE(MAX(sort_order), 0) as max FROM student_feedback"
    );
    const nextOrder = (maxOrder.rows[0]?.max ?? 0) + 1;

    const res = await query<{ id: number }>(
      "INSERT INTO student_feedback (student_name, feedback, media_type, media_url, thumbnail_url, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [studentName, feedback, mediaType, mediaUrl, thumbnailUrl, nextOrder]
    );

    return NextResponse.json({ id: res.rows[0]?.id });
  } catch {
    return NextResponse.json({ error: "Failed to create feedback" }, { status: 500 });
  }
}
