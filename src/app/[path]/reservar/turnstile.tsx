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
  /** Asks for a new token. A token works only once, so after every submission. */
  reset(): void;
};

/**
 * Cloudflare Turnstile's invisible captcha. It checks the browser in the background and
 * hands a token to `onToken` (`null` while there is none, or if it expired), which the
 * form sends for the server to verify.
 */
export function Turnstile({
  ref,
  ...props
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  /** Turnstile could not check the browser (blocked script, network). */
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

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetId.current === undefined || !window.turnstile) return;
      callbacks.current.onToken(null);
      window.turnstile.reset(widgetId.current);
    },
  }));

  useEffect(
    () => () => {
      if (widgetId.current !== undefined) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    },
    [],
  );

  function renderWidget() {
    if (!containerRef.current || !window.turnstile || widgetId.current !== undefined) return;
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: props.siteKey,
      action: "reserve",
      theme: "auto",
      // The form sends the token in its own hidden field.
      "response-field": false,
      callback: (token) => callbacks.current.onToken(token),
      "expired-callback": () => callbacks.current.onToken(null),
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
