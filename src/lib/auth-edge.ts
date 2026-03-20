import type { NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const padLen = (4 - (input.length % 4)) % 4;
  const padded = input + "=".repeat(padLen);
  const b64 = padded.replaceAll("-", "+").replaceAll("_", "/");

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function signHmacSha256(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const bytes = new Uint8Array(sig);

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function verifySessionTokenEdge(token: string): Promise<{ username: string } | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  const expectedSigB64 = await signHmacSha256(secret, payloadB64);

  const sigBytes = base64UrlDecodeToBytes(sigB64);
  const expectedBytes = base64UrlDecodeToBytes(expectedSigB64);
  if (!timingSafeEqual(sigBytes, expectedBytes)) return null;

  try {
    const payloadJson = new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64));
    const payload = JSON.parse(payloadJson) as { u?: string; exp?: number };

    if (!payload?.u || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { username: payload.u };
  } catch {
    return null;
  }
}

export async function getSessionFromRequestEdge(req: NextRequest): Promise<{ username: string } | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionTokenEdge(token);
}
