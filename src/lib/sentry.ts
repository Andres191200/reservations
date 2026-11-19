import type * as Sentry from "@sentry/nextjs";

/**
 * Sentry's options, the same for the server and the browser: errors only. No performance
 * traces (no `tracesSampleRate`), no Session Replay. And none of the Customers' personal
 * data: no user info, cookies, headers (they carry the IP), request bodies (a Reservation
 * form has a name, an email and a phone), query results or local variables, and the
 * parameters of failed queries are removed from every message.
 */
export function sentryOptions(dsn: string): Sentry.BrowserOptions & Sentry.NodeOptions {
  return {
    dsn,
    environment: process.env.NODE_ENV,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    // The SDK adds performance tracing in the browser by default: errors only.
    integrations: (defaults) =>
      defaults.filter((integration) => !/Tracing|Replay/.test(integration.name)),
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  };
}

/**
 * Drizzle's "Failed query" errors end with the query's parameters ("params: ana@mail.com,
 * Ana Pérez, …"): personal data of Customers and Admins. They stay in our server's log,
 * but never go to Sentry.
 */
export function withoutQueryParams(text: string): string {
  return text.replace(/\nparams: [\s\S]*$/, "\nparams: [omitidos]");
}

type SentryEvent = Parameters<NonNullable<Sentry.NodeOptions["beforeSend"]>>[0];
type Breadcrumb = NonNullable<SentryEvent["breadcrumbs"]>[number];

/**
 * A breadcrumb keeps its message without query parameters. A console one also loses its
 * arguments: they are the logged objects themselves, error messages included.
 */
function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const { data, ...rest } = breadcrumb;
  return {
    ...rest,
    ...(breadcrumb.category === "console" ? {} : { data }),
    message: breadcrumb.message && withoutQueryParams(breadcrumb.message),
  };
}

export function scrubEvent<E extends SentryEvent>(event: E): E {
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = withoutQueryParams(exception.value);
  }
  if (event.message) event.message = withoutQueryParams(event.message);
  if (event.logentry?.message) event.logentry.message = withoutQueryParams(event.logentry.message);
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  return event;
}
