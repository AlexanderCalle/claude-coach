import { useState } from "react";
import type { Workout, TrainingDay } from "../../schema/training-plan";
import type { Settings } from "../stores/settings";
import { formatDuration, formatDistance } from "../lib/utils";
import { cx } from "../lib/cx";

interface Props {
  workout: Workout;
  day: TrainingDay;
  settings: Settings;
  isCompleted: boolean;
  onClick: () => void;
}

export default function WorkoutCard({ workout, settings, isCompleted, onClick }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragStart(e: React.DragEvent) {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", workout.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  // Distance first, then duration ("10.2 km · 52m"), matching how the plan
  // reads a workout at a glance - falls back to whichever one is present.
  const metaLabel = [
    formatDistance(workout.distanceMeters, workout.sport, settings),
    formatDuration(workout.durationMinutes),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      className={cx(
        "workout-card",
        workout.sport,
        isCompleted && "completed",
        isDragging && "dragging"
      )}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      <div className="workout-sport">{workout.sport}</div>
      <div className="workout-name">{workout.name}</div>
      {metaLabel ? <div className="workout-duration">{metaLabel}</div> : null}
    </button>
  );
}
