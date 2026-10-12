import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function errorMessage(error: unknown) {
  if (error instanceof ZodError)
    return error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return "Record not found";
    if (error.code === "P2003") return "A related record no longer exists";
    return "Unable to save this record. Please reload and try again.";
  }
  return error instanceof Error
    ? error.message
    : "Unable to complete the request";
}
export async function respond(work: () => Promise<unknown>, status = 200) {
  try {
    const result = await work();
    if (result === null)
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    return NextResponse.json(result, { status });
  } catch (error) {
    const status =
      error instanceof RequestError
        ? error.status
        : error instanceof ZodError ||
            error instanceof SyntaxError ||
            error instanceof RangeError
          ? 400
          : error instanceof Prisma.PrismaClientKnownRequestError
            ? error.code === "P2025"
              ? 404
              : 409
            : 500;
    return NextResponse.json({ error: errorMessage(error) }, { status });
  }
}
