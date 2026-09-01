export const SESSION_COOKIE_NAME = "mt_tracker_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sign(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("authenticated")
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(password: string): Promise<string> {
  return sign(password);
}

export async function isValidSession(
  token: string | undefined,
  password: string
): Promise<boolean> {
  if (!token) return false;
  const expected = await sign(password);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
