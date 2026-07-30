"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Synced from the data-theme DOM attribute the blocking pre-hydration
    // script in layout.tsx sets before this component ever mounts — there's
    // no React-owned state to read this from instead.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-secondary"
      style={{ fontSize: 12, gap: 6 }}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
        <path
          opacity="0.25"
          d="M216.7,152.6A96,96,0,0,1,103.4,39.3,96,96,0,1,0,216.7,152.6Z"
        ></path>
        <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"></path>
      </svg>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
