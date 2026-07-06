import { NextResponse } from "next/server";
import { UnauthorizedError } from "./session";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

/** Uniform error handling for API route try/catch blocks. */
export function handleError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // eslint-disable-next-line no-console
  console.error("[luminary] API error:", err);
  const message = err instanceof Error ? err.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}
