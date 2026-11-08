"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { RUTA_LOGIN } from "./sesion";

export type EstadoLogin = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Ingresá un email válido.")),
  contrasena: z.string().min(1, "Ingresá tu contraseña."),
});

export async function iniciarSesion(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "");
  const parseo = loginSchema.safeParse({ email, contrasena: formData.get("contrasena") ?? "" });
  if (!parseo.success) {
    return { error: parseo.error.issues[0].message, email };
  }

  try {
    await auth.api.signInEmail({
      body: { email: parseo.data.email, password: parseo.data.contrasena },
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

export async function cerrarSesion(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect(RUTA_LOGIN);
}
