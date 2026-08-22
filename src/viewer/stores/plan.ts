import type { TrainingPlan } from "../../schema/training-plan";

// Load plan from embedded JSON. Must only be called client-side (e.g. from a
// useEffect) - the page is statically exported, so there is no `document`
// during the Next.js build.
export function loadPlanData(): TrainingPlan {
  const el = document.getElementById("plan-data");
  if (!el) throw new Error("Plan data not found");
  return JSON.parse(el.textContent || "{}");
}

// Completed workouts stored in localStorage
export function loadCompleted(planId: string): Record<string, boolean> {
  const saved = localStorage.getItem(`plan-${planId}-completed`);
  return saved ? JSON.parse(saved) : {};
}

export function saveCompleted(planId: string, completed: Record<string, boolean>): void {
  localStorage.setItem(`plan-${planId}-completed`, JSON.stringify(completed));
}
