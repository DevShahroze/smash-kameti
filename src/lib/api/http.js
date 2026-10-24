import { NextResponse } from "next/server";

export function jsonOk(data, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message, status = 400, details = null) {
  return NextResponse.json(
    { ok: false, error: message, details },
    { status },
  );
}

export async function parseBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
