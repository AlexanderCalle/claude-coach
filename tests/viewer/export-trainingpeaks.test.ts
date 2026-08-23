import { describe, it, expect } from "vitest";
import { generateTrainingPeaksCsv } from "../../src/viewer/lib/export/trainingpeaks.js";
import type { TrainingPlan } from "../../src/schema/training-plan.js";

/**
 * Create a minimal mock TrainingPlan for testing
 */
function createMockPlan(overrides: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    version: "1.0",
    meta: {
      id: "test-plan",
      athlete: "Test Athlete",
      event: "Test Marathon",
      eventDate: "2025-06-15",
      planStartDate: "2025-01-01",
      planEndDate: "2025-06-15",
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
      totalWeeks: 24,
      generatedBy: "Runnify Assistant",
    },
    preferences: {
      swim: "meters",
      bike: "kilometers",
      run: "kilometers",
      firstDayOfWeek: "monday",
    },
    assessment: {
      foundation: {
        raceHistory: [],
        peakTrainingLoad: 10,
        foundationLevel: "intermediate",
        yearsInSport: 3,
      },
      currentForm: {
        weeklyVolume: { total: 8 },
        longestSessions: {},
        consistency: 5,
      },
      strengths: [],
      limiters: [],
      constraints: [],
    },
    zones: {},
    phases: [],
    weeks: [],
    raceStrategy: {
      event: {
        name: "Test Marathon",
        date: "2025-06-15",
        type: "marathon",
      },
      pacing: {},
      nutrition: {
        preRace: "",
        during: {
          carbsPerHour: 60,
          fluidPerHour: "500ml",
          products: [],
        },
        notes: "",
      },
      taper: {
        startDate: "2025-06-01",
        volumeReduction: 40,
        notes: "",
      },
      raceDay: {},
    },
    ...overrides,
  };
}

describe("TrainingPeaks CSV Export", () => {
  describe("generateTrainingPeaksCsv", () => {
    it("generates a header row with expected columns", () => {
      const plan = createMockPlan();
      const csv = generateTrainingPeaksCsv(plan);
      const [header] = csv.split("\r\n");

      expect(header).toBe(
        "WorkoutDay,Title,WorkoutType,CoachComments,PlannedDuration,PlannedDistance,TSSPlanned"
      );
    });

    it("creates a row for each workout in the plan", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Base",
            focus: "Aerobic foundation",
            targetHours: 8,
            isRecoveryWeek: false,
            summary: { totalHours: 8, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon-run",
                    sport: "run",
                    type: "endurance",
                    name: "Easy Run",
                    description: "Zone 2 easy run",
                    durationMinutes: 45,
                    distanceMeters: 8000,
                    completed: false,
                  },
                ],
              },
              {
                date: "2025-01-07",
                dayOfWeek: "Tuesday",
                workouts: [
                  {
                    id: "w1-tue-swim",
                    sport: "swim",
                    type: "technique",
                    name: "Technique Swim",
                    description: "Focus on form",
                    durationMinutes: 60,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const csv = generateTrainingPeaksCsv(plan);
      const rows = csv.split("\r\n");

      expect(rows).toHaveLength(3); // header + 2 workouts
      expect(rows[1]).toBe("2025-01-06,Easy Run,Run,Zone 2 easy run,0.75,8000,");
      expect(rows[2]).toBe("2025-01-07,Technique Swim,Swim,Focus on form,1.00,,");
    });

    it("skips rest days without an actual workout", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Recovery",
            focus: "Recovery",
            targetHours: 6,
            isRecoveryWeek: true,
            summary: { totalHours: 6, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon-rest",
                    sport: "rest",
                    type: "rest",
                    name: "",
                    description: "",
                    completed: false,
                  },
                ],
              },
              {
                date: "2025-01-07",
                dayOfWeek: "Tuesday",
                workouts: [
                  {
                    id: "w1-tue-rest",
                    sport: "rest",
                    type: "recovery",
                    name: "Active Recovery",
                    description: "Light stretching",
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const csv = generateTrainingPeaksCsv(plan);
      const rows = csv.split("\r\n");

      // header + 1 named active recovery workout only
      expect(rows).toHaveLength(2);
      expect(rows[1]).toContain("Active Recovery,Other,Light stretching");
    });

    it("maps sports to TrainingPeaks workout types", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Build",
            focus: "Build",
            targetHours: 10,
            isRecoveryWeek: false,
            summary: { totalHours: 10, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon-bike",
                    sport: "bike",
                    type: "endurance",
                    name: "Long Ride",
                    description: "",
                    durationMinutes: 120,
                    completed: false,
                  },
                ],
              },
              {
                date: "2025-01-07",
                dayOfWeek: "Tuesday",
                workouts: [
                  {
                    id: "w1-tue-brick",
                    sport: "brick",
                    type: "brick",
                    name: "Bike-Run Brick",
                    description: "",
                    durationMinutes: 90,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const csv = generateTrainingPeaksCsv(plan);

      expect(csv).toContain("Long Ride,Bike,");
      expect(csv).toContain("Bike-Run Brick,Brick,");
    });

    it("includes TSS when available and leaves it blank otherwise", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Build",
            focus: "Build",
            targetHours: 5,
            isRecoveryWeek: false,
            summary: { totalHours: 5, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon-swim",
                    sport: "swim",
                    type: "technique",
                    name: "Threshold Swim",
                    description: "",
                    durationMinutes: 60,
                    structure: {
                      main: [],
                      estimatedTSS: 45,
                    },
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const csv = generateTrainingPeaksCsv(plan);
      const rows = csv.split("\r\n");

      expect(rows[1]).toBe("2025-01-06,Threshold Swim,Swim,,1.00,,45");
    });

    it("escapes commas, quotes, and newlines in text fields", () => {
      const plan = createMockPlan({
        weeks: [
          {
            weekNumber: 1,
            startDate: "2025-01-06",
            endDate: "2025-01-12",
            phase: "Base",
            focus: "Build",
            targetHours: 8,
            isRecoveryWeek: false,
            summary: { totalHours: 8, bySport: {} },
            days: [
              {
                date: "2025-01-06",
                dayOfWeek: "Monday",
                workouts: [
                  {
                    id: "w1-mon",
                    sport: "run",
                    type: "intervals",
                    name: 'Intervals, "Hard"',
                    description: "Run hard\nThen recover",
                    durationMinutes: 60,
                    completed: false,
                  },
                ],
              },
            ],
          },
        ],
      });

      const csv = generateTrainingPeaksCsv(plan);

      expect(csv).toContain('"Intervals, ""Hard"""');
      expect(csv).toContain('"Run hard\nThen recover"');
    });
  });
});
