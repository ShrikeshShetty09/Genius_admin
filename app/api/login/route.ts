import { NextResponse } from "next/server";
import { createSessionToken, getCookieName } from "@/src/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Missing ADMIN_USERNAME or ADMIN_PASSWORD in .env.local" },
        { status: 500 }
      );
    }

    if (!process.env.ADMIN_SESSION_SECRET) {
      return NextResponse.json(
        { error: "Missing ADMIN_SESSION_SECRET in .env.local" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as { username?: string; password?: string } | null;

    const username = body?.username || "";
    const password = body?.password || "";

    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = createSessionToken(username);
    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: getCookieName(),
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
