"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { LOGIN_ROUTE } from "./session";

export type SignInState = { error?: string; email?: string };

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Ingresá un email válido.")),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const parsed = signInSchema.safeParse({ email, password: formData.get("password") ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, email };
  }

  try {
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { error: "Email o contraseña incorrectos.", email };
    }
    throw error;
  }
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect(LOGIN_ROUTE);
}
