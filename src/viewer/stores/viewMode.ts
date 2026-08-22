import { planData } from "./plan.js";

export type ViewMode = "weeks" | "calendar";

const storageKey = `plan-${planData.meta.id}-viewmode`;

export function loadViewMode(): ViewMode {
  const saved = localStorage.getItem(storageKey);
  return saved === "calendar" ? "calendar" : "weeks";
}

export function saveViewMode(mode: ViewMode): void {
  localStorage.setItem(storageKey, mode);
}
