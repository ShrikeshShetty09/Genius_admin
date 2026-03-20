import crypto from "crypto";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing ADMIN_SESSION_SECRET");
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string): Buffer {
  const pad = 4 - (input.length % 4 || 4);
  const padded = input + "=".repeat(pad);
  const b64 = padded.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(b64, "base64");
}

function sign(data: string): string {
  return base64UrlEncode(crypto.createHmac("sha256", getSecret()).update(data).digest());
}

export function createSessionToken(username: string, maxAgeSeconds = 60 * 60 * 12): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = JSON.stringify({ u: username, exp });
  const payloadB64 = base64UrlEncode(payload);
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): { username: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8")) as {
      u: string;
      exp: number;
    };

    if (!payload?.u || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { username: payload.u };
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): { username: string } | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getCookieName(): string {
  return COOKIE_NAME;
}
