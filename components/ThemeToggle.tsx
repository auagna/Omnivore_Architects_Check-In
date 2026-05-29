"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "jabsik-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const nextTheme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";

    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function selectTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <div aria-label="테마 설정" className="grid grid-cols-2 gap-2">
      {[
        ["light", "라이트"],
        ["dark", "다크"]
      ].map(([value, label]) => (
        <button
          className={`theme-button ${theme === value ? "theme-button-active" : ""}`}
          key={value}
          type="button"
          onClick={() => selectTheme(value as Theme)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
