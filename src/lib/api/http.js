import { NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/security/headers";
import { containsOperatorInjection } from "@/lib/security/sanitize";

const MAX_BODY_BYTES = 512_000;

export function jsonOk(data, status = 200) {
  return NextResponse.json(
    { ok: true, data },
    { status, headers: withSecurityHeaders() },
  );
}

export function jsonError(message, status = 400, details = null) {
  return NextResponse.json(
    { ok: false, error: message, details },
    { status, headers: withSecurityHeaders() },
  );
}

/**
 * Parse JSON body with size limit and rejection of operator-injection objects.
 * @returns {Promise<object|null|symbol>} data, null if empty, or throws via jsonError pattern
 */
export async function parseBody(request) {
  const contentType = request.headers.get("content-type") || "";
  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    contentType &&
    !contentType.toLowerCase().includes("application/json")
  ) {
    return null;
  }

  let text = "";
  try {
    text = await request.text();
  } catch {
    return null;
  }

  if (text.length > MAX_BODY_BYTES) {
    return null;
  }
  if (!text.trim()) {
    return null;
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  if (containsOperatorInjection(body)) {
    return null;
  }

  return body;
}
