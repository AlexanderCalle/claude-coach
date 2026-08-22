import type { TrainingPlan, Workout } from "../../schema/training-plan";

/**
 * Tracks all user modifications to the plan.
 * These are stored as overlays on top of the original plan data.
 */
export interface PlanChanges {
  // Workouts moved to different dates: workoutId -> newDate (ISO string)
  moved: Record<string, string>;

  // Workouts with edited properties: workoutId -> partial workout overrides
  edited: Record<string, Partial<Workout>>;

  // Workouts that have been deleted (hidden)
  deleted: string[];

  // New workouts added by user: generated ID -> { date, workout }
  added: Record<string, { date: string; workout: Workout }>;
}

export function emptyChanges(): PlanChanges {
  return {
    moved: {},
    edited: {},
    deleted: [],
    added: {},
  };
}

export function loadChanges(planId: string): PlanChanges {
  const saved = localStorage.getItem(`plan-${planId}-changes`);
  if (!saved) return emptyChanges();

  try {
    const parsed = JSON.parse(saved);
    return {
      moved: parsed.moved || {},
      edited: parsed.edited || {},
      deleted: parsed.deleted || [],
      added: parsed.added || {},
    };
  } catch {
    return emptyChanges();
  }
}

export function saveChanges(planId: string, changes: PlanChanges): void {
  localStorage.setItem(`plan-${planId}-changes`, JSON.stringify(changes));
}

// Helper to generate unique IDs for new workouts
export function generateWorkoutId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Get the effective date for a workout (considering moves)
export function getWorkoutDate(
  workoutId: string,
  originalDate: string,
  changes: PlanChanges
): string {
  return changes.moved[workoutId] || originalDate;
}

// Get the effective workout data (considering edits)
export function getEffectiveWorkout(workout: Workout, changes: PlanChanges): Workout {
  const edits = changes.edited[workout.id];
  if (!edits) return workout;
  return { ...workout, ...edits };
}

// Check if a workout is deleted
export function isWorkoutDeleted(workoutId: string, changes: PlanChanges): boolean {
  return changes.deleted.includes(workoutId);
}

// Build a map of every workout's effective date (respecting moves, edits, deletes,
// and user-added workouts), across the whole plan. Shared by any view that needs
// to place workouts on dates - week cards, calendar, etc.
export function buildWorkoutsByDate(
  plan: TrainingPlan,
  changes: PlanChanges
): Record<string, Workout[]> {
  const byDate: Record<string, Workout[]> = {};

  plan.weeks?.forEach((week) => {
    week.days?.forEach((day) => {
      day.workouts?.forEach((workout) => {
        if (isWorkoutDeleted(workout.id, changes)) return;
        const date = getWorkoutDate(workout.id, day.date, changes);
        (byDate[date] ??= []).push(getEffectiveWorkout(workout, changes));
      });
    });
  });

  Object.entries(changes.added ?? {}).forEach(([id, { date, workout }]) => {
    if (isWorkoutDeleted(id, changes)) return;
    (byDate[date] ??= []).push(workout);
  });

  return byDate;
}

// Find the original (pre-move) date for a workout, needed to record a new move.
export function getOriginalDate(
  plan: TrainingPlan,
  changes: PlanChanges,
  workoutId: string
): string {
  if (changes.added?.[workoutId]) return changes.added[workoutId].date;

  for (const week of plan.weeks ?? []) {
    for (const day of week.days ?? []) {
      for (const workout of day.workouts ?? []) {
        if (workout.id === workoutId) return day.date;
      }
    }
  }
  return "";
}
