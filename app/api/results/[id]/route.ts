import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultId = Number(id);

  const body = (await req.json().catch(() => null)) as {
    student_name?: string;
    percentage?: string | null;
    year?: string | null;
    description?: string | null;
    image_url?: string | null;
  } | null;

  const studentName = body?.student_name?.trim();
  const percentage = body?.percentage ?? null;
  const year = body?.year ?? null;
  const description = body?.description ?? null;
  const imageUrl = body?.image_url ?? null;

  if (!resultId || !studentName) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await query(
      "UPDATE results SET student_name=$1, percentage=$2, year=$3, description=$4, image_url=$5 WHERE id=$6",
      [studentName, percentage, year, description, imageUrl, resultId]
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update result" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resultId = Number(id);

  if (!resultId) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await query("DELETE FROM results WHERE id=$1", [resultId]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete result" }, { status: 500 });
  }
}
