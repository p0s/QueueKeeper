"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const storageKey = "queuekeeper-theme";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(storageKey, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current);
  }, []);

  function toggle() {
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <div className="theme-toggle-shell">
      <button
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        aria-pressed={theme === "dark"}
        className="theme-switch"
        onClick={toggle}
        type="button"
      >
        <span className="theme-switch-label">{theme === "light" ? "Light" : "Dark"}</span>
        <span className={`theme-switch-thumb ${theme === "dark" ? "dark" : "light"}`}>
          {theme === "light" ? "☀" : "☾"}
        </span>
      </button>
    </div>
  );
}
