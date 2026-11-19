"use client";

import { useLayoutEffect } from "react";
import styles from "./theme-toggle.module.scss";

type Theme = "light" | "dark";

/** Where the chosen theme is saved, in this browser. The script in layout.tsx reads it too. */
export const THEME_STORAGE_KEY = "theme";

/**
 * Sets the saved theme on <html> before the first paint. Inline in <head>, so it runs
 * while the HTML is parsed and the wrong theme never flashes. Without a saved choice it
 * does nothing: the CSS follows the browser's preference.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

function savedTheme(): Theme | null {
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    return theme === "light" || theme === "dark" ? theme : null;
  } catch {
    return null;
  }
}

/** The theme on screen: the saved choice, or else the browser's preference. */
function currentTheme(): Theme {
  const chosen = document.documentElement.getAttribute("data-theme");
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Switches between the light and dark themes, and remembers the choice in this browser. */
export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  // In development, React's Strict Mode remount clears the attribute the inline script
  // set on <html>; this puts it back before paint. In production it changes nothing.
  useLayoutEffect(() => {
    const theme = savedTheme();
    if (theme) document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Without storage the change still applies, only for this visit.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={floating ? `${styles.toggle} ${styles.floating}` : styles.toggle}
      aria-label="Cambiar entre tema claro y oscuro"
      title="Cambiar entre tema claro y oscuro"
    >
      {/* Both icons are rendered; the CSS shows the one of the other theme. */}
      <span className={styles.toLight} aria-hidden="true">
        ☀
      </span>
      <span className={styles.toDark} aria-hidden="true">
        ☾
      </span>
    </button>
  );
}
