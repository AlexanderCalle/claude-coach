/**
 * TrainingPeaks CSV Export
 *
 * Generates a CSV file matching TrainingPeaks' "Import Planned Workouts" format
 * (Account Settings -> Import), which lets an athlete or coach bulk-schedule
 * planned workouts by uploading a spreadsheet and mapping its columns.
 *
 * Column names follow TrainingPeaks' documented fields:
 * https://help.trainingpeaks.com/hc/en-us/articles/32432105650573-Import-Planned-Workouts-into-TrainingPeaks
 *
 * - WorkoutDay: plain date (YYYY-MM-DD), no time component
 * - Title: workout name
 * - WorkoutType: must match a TrainingPeaks workout type (Swim, Bike, Run, ...)
 * - CoachComments: becomes the workout's description/notes in TrainingPeaks
 * - PlannedDuration: decimal hours (e.g. 1h30m -> 1.5), not HH:MM
 * - PlannedDistance: meters
 * - TSSPlanned: left blank when we don't have an estimate, so TrainingPeaks
 *   can calculate it itself
 *
 * TrainingPeaks' import screen lets you re-map columns after upload, so exact
 * header names matter less than getting sensible, well-labeled data into each
 * column.
 */

import type { TrainingPlan, TrainingDay, Workout, Sport } from "../../../schema/training-plan";

const WORKOUT_TYPE_MAP: Record<Sport, string> = {
  swim: "Swim",
  bike: "Bike",
  run: "Run",
  strength: "Strength",
  brick: "Brick",
  race: "Race",
  rest: "Day Off",
};

const CSV_HEADERS = [
  "WorkoutDay",
  "Title",
  "WorkoutType",
  "CoachComments",
  "PlannedDuration",
  "PlannedDistance",
  "TSSPlanned",
];

/**
 * Escape a value for CSV output (RFC 4180)
 */
function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert minutes to decimal hours, as TrainingPeaks expects for PlannedDuration
 */
function formatPlannedDuration(minutes: number | undefined): string {
  if (!minutes) return "";
  return (minutes / 60).toFixed(2);
}

/**
 * Build the workout description/comments field from the available text fields
 */
function buildCoachComments(workout: Workout): string {
  const parts: string[] = [];
  if (workout.description) parts.push(workout.description);
  if (workout.humanReadable) parts.push(workout.humanReadable);
  if (workout.notes) parts.push(workout.notes);
  return parts.join("\n\n");
}

/**
 * Determine the WorkoutType for a workout. Rest days with a name (e.g. active
 * recovery) aren't a true "Day Off" in TrainingPeaks' sense, so map those to
 * "Other" instead.
 */
function resolveWorkoutType(workout: Workout): string {
  if (workout.sport === "rest" && workout.name) {
    return "Other";
  }
  return WORKOUT_TYPE_MAP[workout.sport] ?? "Other";
}

function generateRow(workout: Workout, day: TrainingDay): string[] {
  return [
    day.date,
    workout.name || WORKOUT_TYPE_MAP[workout.sport] || "Workout",
    resolveWorkoutType(workout),
    buildCoachComments(workout),
    formatPlannedDuration(workout.durationMinutes),
    workout.distanceMeters ? Math.round(workout.distanceMeters).toString() : "",
    workout.structure?.estimatedTSS ? Math.round(workout.structure.estimatedTSS).toString() : "",
  ];
}

/**
 * Generate a TrainingPeaks-compatible CSV for the entire training plan
 */
export function generateTrainingPeaksCsv(plan: TrainingPlan): string {
  const rows: string[][] = [CSV_HEADERS];

  for (const week of plan.weeks ?? []) {
    for (const day of week.days ?? []) {
      for (const workout of day.workouts ?? []) {
        // Skip rest days without an actual workout, matching the .ics export
        if (workout.sport === "rest" && !workout.name) {
          continue;
        }
        rows.push(generateRow(workout, day));
      }
    }
  }

  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}
