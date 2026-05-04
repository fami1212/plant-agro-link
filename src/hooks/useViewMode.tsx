import { useEffect, useState } from "react";

export type ViewMode = "simple" | "advanced";

const KEY = "plantera-view-mode";

export function useViewMode(defaultMode: ViewMode = "simple") {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return defaultMode;
    return (localStorage.getItem(KEY) as ViewMode) || defaultMode;
  });

  useEffect(() => {
    localStorage.setItem(KEY, mode);
  }, [mode]);

  return {
    mode,
    setMode,
    isSimple: mode === "simple",
    isAdvanced: mode === "advanced",
    toggle: () => setMode((m) => (m === "simple" ? "advanced" : "simple")),
  };
}