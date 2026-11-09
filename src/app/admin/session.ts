import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getBusiness, type Business } from "@/db/businesses";
import type { BusinessId } from "@/db/schema";
import { auth } from "@/lib/auth";

export const LOGIN_ROUTE = "/admin/login";

/**
 * The Business of the signed-in Admin. This is the only way to know which Business the
 * panel belongs to: it never comes from the URL or from a form.
 * Without a valid session, redirects to the login. Call it in every panel page and server action.
 */
export const getSessionBusiness = cache(async (): Promise<Business> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect(LOGIN_ROUTE);

  const business = await getBusiness(session.user.businessId as BusinessId);
  if (!business) redirect(LOGIN_ROUTE);
  return business;
});
