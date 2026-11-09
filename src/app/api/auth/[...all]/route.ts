import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// Better Auth endpoints (/api/auth/*). The panel mostly uses server actions,
// but Better Auth needs these routes for the rest of its API.
export const { GET, POST } = toNextJsHandler(auth);
