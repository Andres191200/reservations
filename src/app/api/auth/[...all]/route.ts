import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Endpoints de Better Auth (/api/auth/*). El panel usa sobre todo server actions,
// pero Better Auth necesita estas rutas para el resto de su API.
export const { GET, POST } = toNextJsHandler(auth);
