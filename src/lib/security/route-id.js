import { parseObjectId } from "@/lib/security/sanitize";

export async function getRouteObjectId(params, label = "id") {
  const resolved = await params;
  const id = resolved?.id;
  return parseObjectId(id, label);
}

export async function resolveRouteObjectId(params, label = "id") {
  const oid = await getRouteObjectId(params, label);
  if (!oid) {
    throw new Error(`Invalid ${label}`);
  }
  return oid;
}

export function isInvalidParamError(err) {
  return typeof err?.message === "string" && err.message.startsWith("Invalid ");
}
