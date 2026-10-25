import mongoose from "mongoose";

const DANGEROUS_KEY = /^\$/;
const MAX_QUERY_STRING_LEN = 200;

/** Reject NoSQL operator keys in plain strings (e.g. `{"$gt":""}` as string is ok but not object). */
export function containsOperatorInjection(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.includes("$") && /[$][a-zA-Z]/.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(containsOperatorInjection);
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (DANGEROUS_KEY.test(key)) {
        return true;
      }
      if (containsOperatorInjection(value[key])) {
        return true;
      }
    }
  }
  return false;
}

export function assertSafeQueryString(value, label = "value") {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Invalid ${label}`);
  }
  if (value.length > MAX_QUERY_STRING_LEN) {
    throw new Error(`Invalid ${label}`);
  }
  if (containsOperatorInjection(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

export function parseObjectId(value, label = "id") {
  const str = assertSafeQueryString(value, label);
  if (!str) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(str)) {
    throw new Error(`Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(str);
}

export function parseEnumParam(value, allowed, label = "value") {
  const str = assertSafeQueryString(value, label);
  if (!str) {
    return null;
  }
  if (!allowed.includes(str)) {
    throw new Error(`Invalid ${label}`);
  }
  return str;
}

export function parsePositiveIntParam(value, label = "value") {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const str = assertSafeQueryString(value, label);
  if (!str) {
    return null;
  }
  const num = Number(str);
  if (!Number.isInteger(num) || num < 1 || num > 1_000_000) {
    throw new Error(`Invalid ${label}`);
  }
  return num;
}
