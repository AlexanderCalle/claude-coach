<script lang="ts">
  import type {
    TrainingPlan,
    TrainingWeek,
    TrainingDay,
    Workout,
  } from "../../schema/training-plan.js";
  import type { Settings } from "../stores/settings.js";
  import type { PlanChanges } from "../stores/changes.js";
  import { buildWorkoutsByDate, getOriginalDate } from "../stores/changes.js";
  import { loadViewMode, saveViewMode, type ViewMode } from "../stores/viewMode.js";
  import WeekCard from "./WeekCard.svelte";
  import CalendarView from "./CalendarView.svelte";
  import {
    getOrderedDays,
    getTodayISO,
    parseDate,
    formatDateISO,
    filterWorkout,
  } from "../lib/utils.js";

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

  let {
    plan,
    settings,
    filters,
    completed,
    changes,
    onWorkoutClick,
    onWorkoutMove,
    onAddWorkout,
  }: Props = $props();

  const today = getTodayISO();

  let viewMode = $state<ViewMode>(loadViewMode());

  function setViewMode(mode: ViewMode) {
    viewMode = mode;
    saveViewMode(mode);
  }

  // Every workout's effective date (respecting moves/edits/deletes/additions),
  // shared by both the week-cards and calendar views below.
  const workoutsByDate = $derived(buildWorkoutsByDate(plan, changes));

  // Build a full 7-day week with workouts in their effective positions
  function buildFullWeek(weekData: TrainingWeek): TrainingDay[] {
    const orderedDayNames = getOrderedDays(settings.firstDayOfWeek);
    const dayNameOrder = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

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
</script>

<div class="view-header">
  <div class="phase-timeline">
    {#each plan.phases ?? [] as phase, idx}
      {@const weeks = phase.endWeek - phase.startWeek + 1}
      {@const phaseName = phase.name.toLowerCase()}
      <button
        class="phase-segment {phaseName}"
        style="flex: {weeks}"
        onclick={() => {
          setViewMode("weeks");
          const weekCard = document.querySelector(`[data-week="${phase.startWeek}"]`);
          weekCard?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      >
        <span class="phase-label">{phase.name}</span>
      </button>
    {/each}
  </div>

  <div class="view-switcher" role="group" aria-label="Plan view">
    <button
      class="view-btn"
      class:active={viewMode === "weeks"}
      onclick={() => setViewMode("weeks")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="4.5" height="16" rx="1.2" />
        <rect x="9.75" y="4" width="4.5" height="16" rx="1.2" />
        <rect x="16.5" y="4" width="4.5" height="16" rx="1.2" />
      </svg>
      <span>Week Cards</span>
    </button>
    <button
      class="view-btn"
      class:active={viewMode === "calendar"}
      onclick={() => setViewMode("calendar")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
      <span>Calendar</span>
    </button>
  </div>
</div>

{#if viewMode === "calendar"}
  <CalendarView
    {plan}
    {settings}
    {today}
    {completed}
    filterWorkout={(w) => filterWorkout(w, filters, completed)}
    {workoutsByDate}
    {onWorkoutClick}
    onDrop={handleDrop}
    {onAddWorkout}
  />
{:else}
  <div class="weeks-container">
    {#each plan.weeks ?? [] as week, index (week.weekNumber)}
      <div data-week={week.weekNumber}>
        <WeekCard
          {week}
          fullWeek={buildFullWeek(week)}
          {settings}
          {today}
          {completed}
          filterWorkout={(w) => filterWorkout(w, filters, completed)}
          {onWorkoutClick}
          onDrop={handleDrop}
          {onAddWorkout}
          animationDelay={index * 0.05}
        />
      </div>
    {/each}
  </div>
{/if}

<style>
  .view-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .phase-timeline {
    display: flex;
    gap: 4px;
    flex: 1;
  }

  .phase-segment {
    flex: 1;
    height: 28px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #64748b, #475569); /* fallback */
  }

  .phase-segment:hover {
    filter: brightness(1.2);
  }

  .phase-segment:active {
    transform: scale(0.98);
  }

  .phase-label {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.9);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .phase-segment.base {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
  }
  .phase-segment.build {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  }
  .phase-segment.peak {
    background: linear-gradient(135deg, #ec4899, #db2777);
  }
  .phase-segment.taper {
    background: linear-gradient(135deg, #14b8a6, #0d9488);
  }
  .phase-segment.recovery {
    background: linear-gradient(135deg, #6b7280, #4b5563);
  }
  .phase-segment.rebuild {
    background: linear-gradient(135deg, #f97316, #ea580c);
  }
  .phase-segment.survival {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }
  .phase-segment.bank {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  .view-switcher {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-subtle);
    border-radius: 10px;
    padding: 0.25rem;
  }

  .view-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.85rem;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    white-space: nowrap;
    transition: all var(--transition-fast);
  }

  .view-btn svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  .view-btn:hover {
    color: var(--text-primary);
  }

  .view-btn.active {
    background: var(--accent);
    color: var(--bg-primary);
  }

  .weeks-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  @media (max-width: 700px) {
    .view-header {
      flex-wrap: wrap;
    }

    .phase-timeline {
      order: 2;
      flex-basis: 100%;
    }

    .view-btn span {
      display: none;
    }
  }
</style>
