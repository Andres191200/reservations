"use client";

import { useLinkStatus } from "next/link";

/**
 * A hidden mark for the `<Link>` that holds it while it is navigating: the link's style
 * reads `data-pending` (`:has()`) to show it was touched. Hidden, it does not take a place
 * in the link's layout.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return <span hidden data-pending={pending || undefined} />;
}
