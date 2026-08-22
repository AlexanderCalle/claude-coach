<script lang="ts">
  import type { TrainingPlan, TrainingDay, Workout } from "../../schema/training-plan.js";
  import type { Settings } from "../stores/settings.js";
  import WorkoutCard from "./WorkoutCard.svelte";
  import { getOrderedDays, parseDate, formatDateISO } from "../lib/utils.js";

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

  let {
    plan,
    settings,
    today,
    completed,
    filterWorkout,
    workoutsByDate,
    onWorkoutClick,
    onDrop,
    onAddWorkout,
  }: Props = $props();

  const jsDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const orderedDayNames = $derived(getOrderedDays(settings.firstDayOfWeek));

  function dayOfWeekFor(date: string): string {
    return jsDayNames[parseDate(date).getDay()];
  }

  function toDay(date: string): TrainingDay {
    return {
      date,
      dayOfWeek: dayOfWeekFor(date),
      workouts: workoutsByDate[date] ?? [],
    };
  }

  // Range of months the plan actually covers, so navigation can't wander off into
  // months with nothing scheduled.
  const planStart = $derived(
    parseDate(plan.meta?.planStartDate || plan.weeks?.[0]?.startDate || today)
  );
  const planEnd = $derived(
    parseDate(plan.meta?.planEndDate || plan.weeks?.[plan.weeks.length - 1]?.endDate || today)
  );
  const minMonth = $derived(new Date(planStart.getFullYear(), planStart.getMonth(), 1));
  const maxMonth = $derived(new Date(planEnd.getFullYear(), planEnd.getMonth(), 1));

  function initialMonth(): Date {
    const t = parseDate(today);
    const tMonth = new Date(t.getFullYear(), t.getMonth(), 1);
    if (tMonth >= minMonth && tMonth <= maxMonth) return tMonth;
    return minMonth;
  }

  let current = $state(initialMonth());

  const canGoPrev = $derived(current > minMonth);
  const canGoNext = $derived(current < maxMonth);

  function prevMonth() {
    if (canGoPrev) current = new Date(current.getFullYear(), current.getMonth() - 1, 1);
  }

  function nextMonth() {
    if (canGoNext) current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  function goToToday() {
    current = initialMonth();
  }

  const monthLabel = $derived(
    current.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  );

  interface Cell {
    date: string;
    inMonth: boolean;
  }

  // Build the visible grid: full weeks, including the lead/trail days that
  // belong to neighboring months so every row has 7 columns.
  const cells = $derived.by((): Cell[] => {
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
  });

  const sportLegend: { sport: Workout["sport"]; label: string }[] = [
    { sport: "run", label: "Run" },
    { sport: "bike", label: "Bike" },
    { sport: "swim", label: "Swim" },
    { sport: "strength", label: "Strength" },
    { sport: "brick", label: "Brick" },
    { sport: "race", label: "Race" },
  ];

  let dragOverDate = $state<string | null>(null);

  function handleDragOver(e: DragEvent, date: string) {
    e.preventDefault();
    dragOverDate = date;
  }

  function handleDragLeave() {
    dragOverDate = null;
  }

  function handleDrop(e: DragEvent, date: string) {
    e.preventDefault();
    dragOverDate = null;
    const workoutId = e.dataTransfer?.getData("text/plain");
    if (workoutId) onDrop(workoutId, date);
  }
</script>

<div class="calendar">
  <div class="calendar-toolbar">
    <div class="month-nav">
      <button class="nav-btn" onclick={prevMonth} disabled={!canGoPrev} aria-label="Previous month">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <span class="month-label">{monthLabel}</span>
      <button class="nav-btn" onclick={nextMonth} disabled={!canGoNext} aria-label="Next month">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
    <button class="today-btn" onclick={goToToday}>Today</button>
  </div>

  <div class="calendar-scroll">
    <div class="weekday-row">
      {#each orderedDayNames as dayName}
        <div class="weekday-label">{dayName.slice(0, 3)}</div>
      {/each}
    </div>

    <div class="calendar-grid">
      {#each cells as cell (cell.date)}
        {@const dayWorkouts = (workoutsByDate[cell.date] ?? []).filter(filterWorkout)}
        {@const isToday = cell.date === today}
        {@const isDragOver = dragOverDate === cell.date}
        <div
          class="calendar-cell"
          class:out-of-month={!cell.inMonth}
          class:today={isToday}
          class:drag-over={isDragOver}
          ondragover={(e) => handleDragOver(e, cell.date)}
          ondragleave={handleDragLeave}
          ondrop={(e) => handleDrop(e, cell.date)}
          role="listbox"
          tabindex="0"
        >
          <div class="cell-header">
            <span class="cell-date">{parseDate(cell.date).getDate()}</span>
          </div>

          <div class="cell-workouts">
            {#each dayWorkouts as workout (workout.id)}
              <WorkoutCard
                {workout}
                day={toDay(cell.date)}
                {settings}
                isCompleted={!!completed[workout.id]}
                onClick={() => onWorkoutClick(workout, toDay(cell.date))}
              />
            {/each}
          </div>

          {#if cell.inMonth}
            <button
              class="add-workout-btn"
              onclick={() => onAddWorkout(toDay(cell.date))}
              title="Add workout"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="legend">
    {#each sportLegend as item}
      <span class="legend-item">
        <span class="legend-dot {item.sport}"></span>
        {item.label}
      </span>
    {/each}
  </div>
</div>

<style>
  .calendar {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .calendar-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .month-nav {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .month-label {
    font-size: 1.05rem;
    font-weight: 600;
    min-width: 11ch;
    text-align: center;
  }

  .nav-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border-medium);
    background: var(--bg-secondary);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
  }

  .nav-btn svg {
    width: 16px;
    height: 16px;
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .today-btn {
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: 1px solid var(--border-medium);
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    transition: all var(--transition-fast);
  }

  .today-btn:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .calendar-scroll {
    overflow-x: auto;
  }

  .weekday-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(90px, 1fr));
    gap: 1px;
  }

  .weekday-label {
    text-align: center;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    padding-bottom: 0.4rem;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(90px, 1fr));
    gap: 1px;
    background: var(--border-subtle);
    border: 1px solid var(--border-subtle);
    border-radius: 16px;
    overflow: hidden;
  }

  .calendar-cell {
    background: var(--bg-secondary);
    min-height: 120px;
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    transition: background-color 0.15s ease;
  }

  .calendar-cell.out-of-month {
    background: var(--bg-primary);
  }

  .calendar-cell.out-of-month .cell-date {
    color: var(--text-muted);
    opacity: 0.5;
  }

  .calendar-cell.today {
    background: var(--bg-tertiary);
  }

  .calendar-cell.today .cell-date {
    color: var(--bg-primary);
    background: var(--accent);
  }

  .calendar-cell.drag-over {
    background: var(--accent-glow);
    outline: 2px dashed var(--accent);
    outline-offset: -2px;
  }

  .cell-header {
    display: flex;
    justify-content: flex-end;
  }

  .cell-date {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.75rem;
    color: var(--text-secondary);
    width: 20px;
    height: 20px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cell-workouts {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
  }

  /* Compact WorkoutCard down to calendar-chip size */
  .cell-workouts :global(.workout-card) {
    padding: 0.35rem 0.5rem;
  }

  .cell-workouts :global(.workout-sport) {
    font-size: 0.55rem;
  }

  .cell-workouts :global(.workout-name) {
    font-size: 0.72rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cell-workouts :global(.workout-duration) {
    font-size: 0.65rem;
    margin-top: 0.15rem;
  }

  .add-workout-btn {
    margin-top: auto;
    padding: 0.35rem;
    border: 1px dashed var(--border-medium);
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    opacity: 0;
  }

  .calendar-cell:hover .add-workout-btn {
    opacity: 1;
  }

  .add-workout-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--border-medium);
    color: var(--text-primary);
  }

  .add-workout-btn svg {
    width: 14px;
    height: 14px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    padding: 0.75rem 0.25rem 0;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--text-secondary);
  }

  .legend-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .legend-dot.run {
    background: var(--run);
  }
  .legend-dot.bike {
    background: var(--bike);
  }
  .legend-dot.swim {
    background: var(--swim);
  }
  .legend-dot.strength {
    background: var(--strength);
  }
  .legend-dot.brick {
    background: var(--brick);
  }
  .legend-dot.race {
    background: var(--race);
  }

  @media (max-width: 700px) {
    .month-label {
      font-size: 0.95rem;
    }
  }
</style>
