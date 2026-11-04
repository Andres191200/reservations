import { NextResponse } from "next/server";
import { z } from "zod";
import { contactSchema } from "@/schemas/contact";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const result = contactSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { ok: false, errors: z.flattenError(result.error).fieldErrors },
      { status: 400 },
    );
  }

  // TODO: persistir / enviar email
  return NextResponse.json({ ok: true, data: result.data });
}
