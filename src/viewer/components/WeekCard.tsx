import { useState } from "react";
import type { TrainingWeek, TrainingDay, Workout } from "../../schema/training-plan";
import type { Settings } from "../stores/settings";
import WorkoutCard from "./WorkoutCard";
import { parseDate, formatDistance } from "../lib/utils";
import { cx } from "../lib/cx";

interface Props {
  week: TrainingWeek;
  fullWeek: TrainingDay[];
  settings: Settings;
  today: string;
  completed: Record<string, boolean>;
  filterWorkout: (workout: Workout) => boolean;
  onWorkoutClick: (workout: Workout, day: TrainingDay) => void;
  onDrop: (workoutId: string, newDate: string) => void;
  onAddWorkout: (day: TrainingDay) => void;
  animationDelay: number;
}

export default function WeekCard({
  week,
  fullWeek,
  settings,
  today,
  completed,
  filterWorkout,
  onWorkoutClick,
  onDrop,
  onAddWorkout,
  animationDelay,
}: Props) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const phaseName = (week.phase ?? "base").toLowerCase();

  const totalKm = Object.values(week.summary?.bySport ?? {}).reduce(
    (sum, sport) => sum + (sport?.km ?? 0),
    0
  );
  // Route through formatDistance (same helper WorkoutCard uses) so the week
  // total respects the athlete's km/mile preference instead of always
  // showing km while the cards below it show miles.
  const distanceLabel = totalKm > 0 ? formatDistance(totalKm * 1000, "run", settings) : "";

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
    <div className="week-card" style={{ animationDelay: `${animationDelay}s` }}>
      <div className="week-header">
        <div className="week-title">
          <span className="week-number">W{week.weekNumber}</span>
          <span className={cx("week-phase", phaseName)}>{week.phase ?? "Base"}</span>
          <span className="week-focus">{week.focus ?? ""}</span>
        </div>
        <div className="week-hours">
          <span>{week.targetHours ?? 0}</span> hrs
          {distanceLabel ? (
            <>
              {" "}
              · <span>{distanceLabel}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="days-grid">
        {fullWeek.map((day) => {
          const isToday = day.date === today;
          const filteredWorkouts = (day.workouts ?? []).filter(filterWorkout);
          const isDragOver = dragOverDate === day.date;

          return (
            <div
              key={day.date}
              className={cx("day-column", isToday && "today", isDragOver && "drag-over")}
              onDragOver={(e) => handleDragOver(e, day.date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day.date)}
              role="listbox"
              tabIndex={0}
            >
              <div className="day-header">
                <span className="day-name">{day.dayOfWeek.slice(0, 3)}</span>
                <span className="day-date">{parseDate(day.date).getDate()}</span>
              </div>

              {filteredWorkouts.length > 0
                ? filteredWorkouts.map((workout) => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      day={day}
                      settings={settings}
                      isCompleted={!!completed[workout.id]}
                      onClick={() => onWorkoutClick(workout, day)}
                    />
                  ))
                : day.workouts.length === 0 && <div className="empty-day">Rest</div>}

              <button
                className="add-workout-btn"
                onClick={() => onAddWorkout(day)}
                title="Add workout"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
