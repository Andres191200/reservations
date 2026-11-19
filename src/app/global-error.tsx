"use client";

import { useLayoutEffect } from "react";
import "@/styles/globals.scss";
import { ErrorScreen } from "./error-screen";
import styles from "./error-screen.module.scss";
import { THEME_STORAGE_KEY } from "./theme-toggle";

/**
 * The root layout itself failed. This replaces the whole document, so it brings its own
 * <html>, <body> and styles, and applies the saved theme itself.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useLayoutEffect(() => {
    try {
      const theme = localStorage.getItem(THEME_STORAGE_KEY);
      if (theme === "light" || theme === "dark") {
        document.documentElement.setAttribute("data-theme", theme);
      }
    } catch {
      // Without storage, the browser's preference decides.
    }
  }, []);

  return (
    <html lang="es">
      <body>
        <title>Algo falló · Reservas</title>
        <main className={styles.page}>
          <ErrorScreen
            error={error}
            retry={retry}
            title="Algo falló"
            message="No pudimos cargar la página. Probá de nuevo en un rato."
          />
        </main>
      </body>
    </html>
  );
}
