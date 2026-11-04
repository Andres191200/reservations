import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres"),
  email: z.email("Email inválido"),
  message: z.string().trim().min(10, "Mínimo 10 caracteres").max(500),
});

export type ContactInput = z.infer<typeof contactSchema>;
