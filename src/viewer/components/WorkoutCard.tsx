import { useState } from "react";
import type { Workout, TrainingDay } from "../../schema/training-plan";
import type { Settings } from "../stores/settings";
import { formatDuration } from "../lib/utils";
import { cx } from "../lib/cx";

interface Props {
  workout: Workout;
  day: TrainingDay;
  settings: Settings;
  isCompleted: boolean;
  onClick: () => void;
}

export default function WorkoutCard({ workout, isCompleted, onClick }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragStart(e: React.DragEvent) {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", workout.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

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
      {workout.durationMinutes ? (
        <div className="workout-duration">{formatDuration(workout.durationMinutes)}</div>
      ) : null}
    </button>
  );
}
