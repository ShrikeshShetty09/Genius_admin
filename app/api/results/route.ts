import { NextResponse } from "next/server";
import { query } from "@/src/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const results = await query<{ id: number }>(
      "SELECT id FROM results ORDER BY id DESC"
    );

    const images = await query<{ id: number; result_id: number; url: string; sort_order: number }>(
      "SELECT id, result_id, url, sort_order FROM result_images ORDER BY sort_order ASC, id ASC"
    );

    const imagesByResult = new Map<number, { id: number; url: string; sort_order: number }[]>();
    for (const img of images.rows) {
      const arr = imagesByResult.get(img.result_id) || [];
      arr.push({ id: img.id, url: img.url, sort_order: img.sort_order });
      imagesByResult.set(img.result_id, arr);
    }

    const payload = results.rows.map((r) => ({
      id: r.id,
      images: imagesByResult.get(r.id) || [],
    }));

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    placeholder?: boolean;
  } | null;

  try {
    const res = await query<{ id: number }>(
      "INSERT INTO results (student_name) VALUES ($1) RETURNING id",
      ["Result"]
    );
    return NextResponse.json({ id: res.rows[0]?.id });
  } catch {
    return NextResponse.json({ error: "Failed to create result" }, { status: 500 });
  }
}
