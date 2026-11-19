import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

// Runs in the browser before the app becomes interactive. With NEXT_PUBLIC_SENTRY_DSN
// (inlined when building), the browser's errors go to Sentry; without it, nothing is
// reported.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) Sentry.init(sentryOptions(dsn));
