"use client";

import Script from "next/script";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";

/** The part of Turnstile's browser API this page uses (explicit rendering). */
type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "auto" | "light" | "dark";
      "response-field"?: boolean;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: (code: string) => void;
    },
  ): string | undefined;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = {
  /**
   * Asks for a new token: a token works only once, so after every submission, and again
   * after a failure. The wait for it starts over.
   */
  reset(): void;
};

/** Without a token by then, Turnstile counts as not responding (blocked, no network). */
export const TOKEN_TIMEOUT_MS = 12_000;

/**
 * Cloudflare Turnstile's invisible captcha. It checks the browser in the background and
 * hands a token to `onToken` (`null` while there is none, or if it expired), which the
 * form sends for the server to verify. If Turnstile fails, or gives no token within
 * `TOKEN_TIMEOUT_MS`, it calls `onError`.
 */
export function Turnstile({
  ref,
  ...props
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  /** Turnstile could not check the browser (blocked script, network, no answer). */
  onError: () => void;
  ref?: Ref<TurnstileHandle>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  // The latest callbacks, without rendering the widget again when they change.
  const callbacks = useRef(props);
  useEffect(() => {
    callbacks.current = props;
  });

  // The wait for a token: from the start, and again after each reset.
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function waitForToken() {
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => callbacks.current.onError(), TOKEN_TIMEOUT_MS);
  }
  function onToken(token: string | null) {
    if (token) clearTimeout(timeout.current);
    callbacks.current.onToken(token);
  }

  useImperativeHandle(ref, () => ({
    reset() {
      waitForToken();
      callbacks.current.onToken(null);
      // If the widget never rendered (the script came late), this is another chance.
      if (widgetId.current === undefined) renderWidget();
      else window.turnstile?.reset(widgetId.current);
    },
  }));

  useEffect(() => {
    waitForToken();
    return () => {
      clearTimeout(timeout.current);
      if (widgetId.current !== undefined) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
    // Only on mount: the wait starts with the page.
  }, []);

  function renderWidget() {
    if (!containerRef.current || !window.turnstile || widgetId.current !== undefined) return;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: props.siteKey,
      action: "reserve",
      theme: "auto",
      // The form sends the token in its own hidden field.
      "response-field": false,
      callback: (token) => onToken(token),
      // Turnstile asks for a new one by itself: the wait starts over.
      "expired-callback": () => {
        waitForToken();
        onToken(null);
      },
      "error-callback": () => callbacks.current.onError(),
    });
  }

  return (
    <>
      <div ref={containerRef} />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={renderWidget}
        onError={() => callbacks.current.onError()}
      />
    </>
  );
}
