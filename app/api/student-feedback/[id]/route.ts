import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feedbackId = Number(id);

  if (!feedbackId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await query("DELETE FROM student_feedback WHERE id=$1", [feedbackId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const feedbackId = Number(id);

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

  if (!feedbackId || !studentName || !feedback || !mediaType || !mediaUrl) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (mediaType !== "image" && mediaType !== "youtube") {
    return NextResponse.json({ error: "Invalid media_type" }, { status: 400 });
  }

  try {
    await query(
      "UPDATE student_feedback SET student_name=$1, feedback=$2, media_type=$3, media_url=$4, thumbnail_url=$5 WHERE id=$6",
      [studentName, feedback, mediaType, mediaUrl, thumbnailUrl, feedbackId]
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}
