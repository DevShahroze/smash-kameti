export const COOKIE_NAME = "sk_session";
export const MAX_AGE_SEC = 30 * 24 * 60 * 60;

export const ROLES = {
  ADMIN: "admin",
  GUEST: "guest",
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return "dev-only-set-AUTH_SECRET-in-env";
  }
  return secret;
}

async function hmacSign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Buffer.from(sig).toString("base64url");
}

export async function createSessionToken(role) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${role}:${exp}`;
  const sig = await hmacSign(payload, getSecret());
  return `${payload}.${sig}`;
}

export async function parseSessionToken(value) {
  if (!value) {
    return null;
  }
  const lastDot = value.lastIndexOf(".");
  if (lastDot < 0) {
    return null;
  }
  const payload = value.slice(0, lastDot);
  const sig = value.slice(lastDot + 1);
  const expected = await hmacSign(payload, getSecret());
  if (sig !== expected) {
    return null;
  }
  const [role, expStr] = payload.split(":");
  if (!role || !expStr) {
    return null;
  }
  if (Number(expStr) < Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (role !== ROLES.ADMIN && role !== ROLES.GUEST) {
    return null;
  }
  return { role };
}

export function isAdminRole(session) {
  return session?.role === ROLES.ADMIN;
}
