import { useMemo, useState } from "react";
import type { TrainingPlan, TrainingWeek, TrainingDay, Workout } from "../../schema/training-plan";
import type { Settings } from "../stores/settings";
import type { PlanChanges } from "../stores/changes";
import { buildWorkoutsByDate, getOriginalDate } from "../stores/changes";
import { loadViewMode, saveViewMode, type ViewMode } from "../stores/viewMode";
import WeekCard from "./WeekCard";
import CalendarView from "./CalendarView";
import { getOrderedDays, getTodayISO, parseDate, formatDateISO, filterWorkout } from "../lib/utils";
import { cx } from "../lib/cx";

interface Props {
  plan: TrainingPlan;
  settings: Settings;
  filters: { sport: string; status: string };
  completed: Record<string, boolean>;
  changes: PlanChanges;
  onWorkoutClick: (workout: Workout, day: TrainingDay) => void;
  onWorkoutMove: (workoutId: string, originalDate: string, newDate: string) => void;
  onAddWorkout: (day: TrainingDay) => void;
}

const dayNameOrder = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Preferred left-to-right order for the "run + strength"-style sport summary,
// so it reads training-first rather than in whatever order sports happen to
// appear in the plan data.
const sportSummaryOrder: Workout["sport"][] = ["swim", "bike", "run", "brick", "strength", "race"];

export default function WeeksContainer({
  plan,
  settings,
  filters,
  completed,
  changes,
  onWorkoutClick,
  onWorkoutMove,
  onAddWorkout,
}: Props) {
  const today = useMemo(() => getTodayISO(), []);

  const [viewMode, setViewModeState] = useState<ViewMode>(() => loadViewMode(plan.meta.id));

  function setViewMode(mode: ViewMode) {
    setViewModeState(mode);
    saveViewMode(plan.meta.id, mode);
  }

  // Every workout's effective date (respecting moves/edits/deletes/additions),
  // shared by both the week-cards and calendar views below.
  const workoutsByDate = useMemo(() => buildWorkoutsByDate(plan, changes), [plan, changes]);

  // "run + strength" style summary of the sports actually scheduled in this plan.
  const sportsSummary = useMemo(() => {
    const present = new Set<string>();
    plan.weeks?.forEach((week) => {
      week.days?.forEach((day) => {
        day.workouts?.forEach((w) => {
          if (w.sport !== "rest") present.add(w.sport);
        });
      });
    });
    return sportSummaryOrder.filter((sport) => present.has(sport)).join(" + ");
  }, [plan]);

  // Build a full 7-day week with workouts in their effective positions
  function buildFullWeek(weekData: TrainingWeek): TrainingDay[] {
    const orderedDayNames = getOrderedDays(settings.firstDayOfWeek);

    // Create a map from day name to the plan's day data
    const planDaysByName: Record<string, TrainingDay> = {};
    weekData.days?.forEach((day) => {
      planDaysByName[day.dayOfWeek] = day;
    });

    // Use the first plan day as reference to calculate missing dates
    const refDay = weekData.days?.[0];
    if (!refDay) {
      // No days in this week, return empty week
      return orderedDayNames.map((dayName) => ({
        date: "",
        dayOfWeek: dayName,
        workouts: [],
      }));
    }
    const refDate = parseDate(refDay.date);
    const refDayIndex = dayNameOrder.indexOf(refDay.dayOfWeek);

    function getDateForDayName(dayName: string): string {
      const targetDayIndex = dayNameOrder.indexOf(dayName);
      let offset = targetDayIndex - refDayIndex;
      // Keep offset in range -6 to +6 for same week
      if (offset < -3) offset += 7;
      if (offset > 3) offset -= 7;
      const date = new Date(refDate);
      date.setDate(date.getDate() + offset);
      return formatDateISO(date);
    }

    // Build array of all 7 dates in this week
    const allWeekDates: string[] = orderedDayNames.map((dayName) => {
      const planDay = planDaysByName[dayName];
      return planDay ? planDay.date : getDateForDayName(dayName);
    });

    // Build full week in the correct display order, pulling from the shared
    // date -> workouts map so moves/edits stay in sync with the calendar view.
    return orderedDayNames.map((dayName, idx) => {
      const date = allWeekDates[idx];
      return {
        date,
        dayOfWeek: dayName,
        workouts: workoutsByDate[date] || [],
      };
    });
  }

  function handleDrop(workoutId: string, newDate: string) {
    const originalDate = getOriginalDate(plan, changes, workoutId);
    onWorkoutMove(workoutId, originalDate, newDate);
  }

  function scrollToWeek(startWeek: number) {
    setViewMode("weeks");
    const weekCard = document.querySelector(`[data-week="${startWeek}"]`);
    weekCard?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="plan-header">
        <h1 className="plan-title">Training plan</h1>
        <div className="plan-subtitle">
          {plan.meta?.totalWeeks ?? plan.weeks?.length ?? 0} weeks
          {plan.phases?.length
            ? ` · ${plan.phases.length} block${plan.phases.length === 1 ? "" : "s"}`
            : ""}
          {sportsSummary ? ` · ${sportsSummary}` : ""}
        </div>
      </div>

      <div className="view-header">
        <div className="phase-timeline">
          {(plan.phases ?? []).map((phase) => {
            const weeks = phase.endWeek - phase.startWeek + 1;
            const phaseName = phase.name.toLowerCase();
            return (
              <button
                key={phase.name + phase.startWeek}
                className={cx("phase-segment", phaseName)}
                style={{ flex: weeks }}
                onClick={() => scrollToWeek(phase.startWeek)}
              >
                <span className="phase-label">{phase.name}</span>
              </button>
            );
          })}
        </div>

        <div className="view-switcher" role="group" aria-label="Plan view">
          <button
            className={cx("view-btn", viewMode === "weeks" && "active")}
            onClick={() => setViewMode("weeks")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="4.5" height="16" rx="1.2" />
              <rect x="9.75" y="4" width="4.5" height="16" rx="1.2" />
              <rect x="16.5" y="4" width="4.5" height="16" rx="1.2" />
            </svg>
            <span>Week Cards</span>
          </button>
          <button
            className={cx("view-btn", viewMode === "calendar" && "active")}
            onClick={() => setViewMode("calendar")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <span>Calendar</span>
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <CalendarView
          plan={plan}
          settings={settings}
          today={today}
          completed={completed}
          filterWorkout={(w) => filterWorkout(w, filters, completed)}
          workoutsByDate={workoutsByDate}
          onWorkoutClick={onWorkoutClick}
          onDrop={handleDrop}
          onAddWorkout={onAddWorkout}
        />
      ) : (
        <div className="weeks-container">
          {(plan.weeks ?? []).map((week, index) => (
            <div key={week.weekNumber} data-week={week.weekNumber}>
              <WeekCard
                week={week}
                fullWeek={buildFullWeek(week)}
                settings={settings}
                today={today}
                completed={completed}
                filterWorkout={(w) => filterWorkout(w, filters, completed)}
                onWorkoutClick={onWorkoutClick}
                onDrop={handleDrop}
                onAddWorkout={onAddWorkout}
                animationDelay={index * 0.05}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
