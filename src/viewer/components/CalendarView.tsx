import { useMemo, useState } from "react";
import type { TrainingPlan, TrainingDay, Workout } from "../../schema/training-plan";
import type { Settings } from "../stores/settings";
import WorkoutCard from "./WorkoutCard";
import { getOrderedDays, parseDate, formatDateISO } from "../lib/utils";
import { cx } from "../lib/cx";

interface Props {
  plan: TrainingPlan;
  settings: Settings;
  today: string;
  completed: Record<string, boolean>;
  filterWorkout: (workout: Workout) => boolean;
  workoutsByDate: Record<string, Workout[]>;
  onWorkoutClick: (workout: Workout, day: TrainingDay) => void;
  onDrop: (workoutId: string, newDate: string) => void;
  onAddWorkout: (day: TrainingDay) => void;
}

const jsDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Cell {
  date: string;
  inMonth: boolean;
}

function dayOfWeekFor(date: string): string {
  return jsDayNames[parseDate(date).getDay()];
}

const sportLegend: { sport: Workout["sport"]; label: string }[] = [
  { sport: "run", label: "Run" },
  { sport: "bike", label: "Bike" },
  { sport: "swim", label: "Swim" },
  { sport: "strength", label: "Strength" },
  { sport: "brick", label: "Brick" },
  { sport: "race", label: "Race" },
];

export default function CalendarView({
  plan,
  settings,
  today,
  completed,
  filterWorkout,
  workoutsByDate,
  onWorkoutClick,
  onDrop,
  onAddWorkout,
}: Props) {
  const orderedDayNames = useMemo(
    () => getOrderedDays(settings.firstDayOfWeek),
    [settings.firstDayOfWeek]
  );

  function toDay(date: string): TrainingDay {
    return {
      date,
      dayOfWeek: dayOfWeekFor(date),
      workouts: workoutsByDate[date] ?? [],
    };
  }

  // Range of months the plan actually covers, so navigation can't wander off into
  // months with nothing scheduled.
  const planStart = parseDate(plan.meta?.planStartDate || plan.weeks?.[0]?.startDate || today);
  const planEnd = parseDate(
    plan.meta?.planEndDate || plan.weeks?.[plan.weeks.length - 1]?.endDate || today
  );
  const minMonth = new Date(planStart.getFullYear(), planStart.getMonth(), 1);
  const maxMonth = new Date(planEnd.getFullYear(), planEnd.getMonth(), 1);

  function initialMonth(): Date {
    const t = parseDate(today);
    const tMonth = new Date(t.getFullYear(), t.getMonth(), 1);
    if (tMonth >= minMonth && tMonth <= maxMonth) return tMonth;
    return minMonth;
  }

  const [current, setCurrent] = useState<Date>(initialMonth);

  const canGoPrev = current > minMonth;
  const canGoNext = current < maxMonth;

  function prevMonth() {
    if (canGoPrev) setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function nextMonth() {
    if (canGoNext) setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function goToToday() {
    setCurrent(initialMonth());
  }

  const monthLabel = current.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Build the visible grid: full weeks, including the lead/trail days that
  // belong to neighboring months so every row has 7 columns.
  const cells: Cell[] = useMemo(() => {
    const year = current.getFullYear();
    const month = current.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstOfMonthName = jsDayNames[new Date(year, month, 1).getDay()];
    const leadCount = orderedDayNames.indexOf(firstOfMonthName);

    const result: Cell[] = [];
    for (let i = leadCount; i > 0; i--) {
      result.push({ date: formatDateISO(new Date(year, month, 1 - i)), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      result.push({ date: formatDateISO(new Date(year, month, day)), inMonth: true });
    }
    while (result.length % 7 !== 0) {
      const last = parseDate(result[result.length - 1].date);
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      result.push({ date: formatDateISO(next), inMonth: false });
    }
    return result;
  }, [current, orderedDayNames]);

  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  function handleDragOver(e: React.DragEvent, date: string) {
    e.preventDefault();
    setDragOverDate(date);
  }

  function handleDragLeave() {
    setDragOverDate(null);
  }

  function handleDrop(e: React.DragEvent, date: string) {
    e.preventDefault();
    setDragOverDate(null);
    const workoutId = e.dataTransfer.getData("text/plain");
    if (workoutId) onDrop(workoutId, date);
  }

  return (
    <div className="calendar">
      <div className="calendar-toolbar">
        <div className="month-nav">
          <button
            className="nav-btn"
            onClick={prevMonth}
            disabled={!canGoPrev}
            aria-label="Previous month"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="month-label">{monthLabel}</span>
          <button
            className="nav-btn"
            onClick={nextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <button className="today-btn" onClick={goToToday}>
          Today
        </button>
      </div>

      <div className="calendar-scroll">
        <div className="weekday-row">
          {orderedDayNames.map((dayName) => (
            <div className="weekday-label" key={dayName}>
              {dayName.slice(0, 3)}
            </div>
          ))}
        </div>

        <div className="calendar-grid">
          {cells.map((cell) => {
            const dayWorkouts = (workoutsByDate[cell.date] ?? []).filter(filterWorkout);
            const isToday = cell.date === today;
            const isDragOver = dragOverDate === cell.date;

            return (
              <div
                key={cell.date}
                className={cx(
                  "calendar-cell",
                  !cell.inMonth && "out-of-month",
                  isToday && "today",
                  isDragOver && "drag-over"
                )}
                onDragOver={(e) => handleDragOver(e, cell.date)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, cell.date)}
                role="listbox"
                tabIndex={0}
              >
                <div className="cell-header">
                  <span className="cell-date">{parseDate(cell.date).getDate()}</span>
                </div>

                <div className="cell-workouts">
                  {dayWorkouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      day={toDay(cell.date)}
                      settings={settings}
                      isCompleted={!!completed[workout.id]}
                      onClick={() => onWorkoutClick(workout, toDay(cell.date))}
                    />
                  ))}
                </div>

                {cell.inMonth && (
                  <button
                    className="add-workout-btn"
                    onClick={() => onAddWorkout(toDay(cell.date))}
                    title="Add workout"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="legend">
        {sportLegend.map((item) => (
          <span className="legend-item" key={item.sport}>
            <span className={cx("legend-dot", item.sport)}></span>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
