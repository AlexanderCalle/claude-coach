export type ViewMode = "weeks" | "calendar";

export function loadViewMode(planId: string): ViewMode {
  const saved = localStorage.getItem(`plan-${planId}-viewmode`);
  return saved === "calendar" ? "calendar" : "weeks";
}

export function saveViewMode(planId: string, mode: ViewMode): void {
  localStorage.setItem(`plan-${planId}-viewmode`, mode);
}
