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
      {/* Both icons are rendered; the CSS shows the one of the other theme. Drawn, not
        the ☀ character, which some systems show as a color emoji. */}
      <svg className={styles.toLight} {...ICON}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
      </svg>
      <svg className={styles.toDark} {...ICON}>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    </button>
  );
}

/** Line icons in the color of the text, the size of the text of the button. */
const ICON = {
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;
