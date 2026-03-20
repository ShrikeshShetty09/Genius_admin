import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Missing BLOB_READ_WRITE_TOKEN in .env.local" }, { status: 500 });
    }

    const originalName = file.name || "upload";
    const ext = originalName.includes(".") ? originalName.split(".").pop() : "bin";
    const safeExt = (ext || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const nameBase = crypto.randomUUID();
    const pathname = `genius-classes/${nameBase}.${safeExt}`;

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
