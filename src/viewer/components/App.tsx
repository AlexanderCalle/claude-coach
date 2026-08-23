import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import WeeksContainer from "./WeeksContainer";
import WorkoutModal from "./WorkoutModal";
import SettingsModal from "./SettingsModal";
import ImportHelpModal from "./ImportHelpModal";
import { loadCompleted, saveCompleted } from "../stores/plan";
import { loadSettings, saveSettings, type Settings } from "../stores/settings";
import { loadChanges, saveChanges, type PlanChanges, generateWorkoutId } from "../stores/changes";
import type { TrainingPlan, Workout, TrainingDay } from "../../schema/training-plan";

interface Props {
  plan: TrainingPlan;
}

type ModalState =
  | { mode: "view"; workout: Workout; day: TrainingDay }
  | { mode: "create"; day: TrainingDay }
  | null;

export default function App({ plan }: Props) {
  const planId = plan.meta.id;

  const [settings, setSettings] = useState<Settings>(() => loadSettings(plan));
  const [completed, setCompleted] = useState<Record<string, boolean>>(() => loadCompleted(planId));
  const [changes, setChanges] = useState<PlanChanges>(() => loadChanges(planId));
  const [filters, setFilters] = useState({ sport: "all", status: "all" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importHelpOpen, setImportHelpOpen] = useState(false);

  // First-change banner state
  const bannerKey = `plan-${planId}-banner-dismissed`;
  const [showBanner, setShowBanner] = useState(false);

  function triggerBanner() {
    if (localStorage.getItem(bannerKey) !== "true") {
      setShowBanner(true);
    }
  }

  function dismissBanner() {
    setShowBanner(false);
    localStorage.setItem(bannerKey, "true");
  }

  const [modalState, setModalState] = useState<ModalState>(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  // Apply completed state to plan workouts (mutated in place, matching the
  // original Svelte behavior of overlaying `completed` onto the plan data
  // before it's read by child components during this render).
  plan.weeks?.forEach((week) => {
    week.days?.forEach((day) => {
      day.workouts?.forEach((w) => {
        w.completed = !!completed[w.id];
      });
    });
  });

  function handleSettingsChange(newSettings: Settings) {
    setSettings(newSettings);
    saveSettings(planId, newSettings);
  }

  function handleToggleComplete(workoutId: string) {
    setCompleted((prev) => {
      const next = { ...prev };
      if (next[workoutId]) {
        delete next[workoutId];
      } else {
        next[workoutId] = true;
      }
      saveCompleted(planId, next);
      return next;
    });
    triggerBanner();
  }

  function handleWorkoutClick(workout: Workout, day: TrainingDay) {
    setModalState({ mode: "view", workout, day });
  }

  function handleAddWorkout(day: TrainingDay) {
    setModalState({ mode: "create", day });
  }

  function handleCloseModal() {
    setModalState(null);
  }

  // Change handlers
  function handleWorkoutMove(workoutId: string, originalDate: string, newDate: string) {
    setChanges((prev) => {
      const next = { ...prev, moved: { ...prev.moved } };
      if (originalDate === newDate) {
        // Moving back to original - remove the move
        delete next.moved[workoutId];
      } else {
        next.moved[workoutId] = newDate;
      }
      saveChanges(planId, next);
      return next;
    });
    triggerBanner();
  }

  function handleWorkoutSave(updates: Partial<Workout>) {
    if (!modalState) return;

    if (modalState.mode === "create") {
      // Create new workout
      const id = generateWorkoutId();
      const fullWorkout: Workout = {
        id,
        sport: updates.sport || "run",
        type: updates.type || "endurance",
        name: updates.name || "Workout",
        description: updates.description || "",
        durationMinutes: updates.durationMinutes,
        distanceMeters: updates.distanceMeters,
        primaryZone: updates.primaryZone,
        humanReadable: updates.humanReadable,
        completed: false,
      };
      setChanges((prev) => {
        const next = {
          ...prev,
          added: { ...prev.added, [id]: { date: modalState.day.date, workout: fullWorkout } },
        };
        saveChanges(planId, next);
        return next;
      });
      triggerBanner();
      setModalState(null);
    } else {
      // Edit existing workout
      const workoutId = modalState.workout.id;

      setChanges((prev) => {
        let next: PlanChanges;
        if (prev.added[workoutId]) {
          // Update the added workout directly
          next = {
            ...prev,
            added: {
              ...prev.added,
              [workoutId]: {
                ...prev.added[workoutId],
                workout: { ...prev.added[workoutId].workout, ...updates },
              },
            },
          };
        } else {
          // Store edits as overlay
          next = {
            ...prev,
            edited: {
              ...prev.edited,
              [workoutId]: { ...(prev.edited[workoutId] || {}), ...updates },
            },
          };
        }
        saveChanges(planId, next);
        return next;
      });
      triggerBanner();

      // Update the modal state with the new workout data
      setModalState({
        ...modalState,
        workout: { ...modalState.workout, ...updates },
      });
    }
  }

  function handleWorkoutDelete(workoutId: string) {
    setChanges((prev) => {
      let next: PlanChanges;
      if (prev.added[workoutId]) {
        // Remove from added
        const added = { ...prev.added };
        delete added[workoutId];
        next = { ...prev, added };
      } else {
        // Mark as deleted
        next = prev.deleted.includes(workoutId)
          ? prev
          : { ...prev, deleted: [...prev.deleted, workoutId] };
      }
      saveChanges(planId, next);
      return next;
    });
    triggerBanner();
    setModalState(null);
  }

  return (
    <>
      {showBanner ? (
        <div className="local-storage-banner">
          <div className="banner-content">
            <span className="banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </span>
            <p>
              Your changes are saved locally in this browser only. To back up or transfer your data,{" "}
              <button
                className="banner-link"
                onClick={() => {
                  dismissBanner();
                  setSettingsOpen(true);
                }}
              >
                export it from Settings
              </button>
              .
            </p>
            <button className="banner-close" onClick={dismissBanner} aria-label="Dismiss">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <div className="app">
        <Sidebar
          plan={plan}
          settings={settings}
          filters={filters}
          completed={completed}
          open={sidebarOpen}
          onFilterChange={setFilters}
          onSettingsClick={() => setSettingsOpen(true)}
          onImportHelpClick={() => setImportHelpOpen(true)}
        />

        <main className="main-content">
          <div className="mobile-header">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <h2 className="mobile-title">{plan.meta?.event ?? "Training Plan"}</h2>
          </div>

          <WeeksContainer
            plan={plan}
            settings={settings}
            filters={filters}
            completed={completed}
            changes={changes}
            onWorkoutClick={handleWorkoutClick}
            onWorkoutMove={handleWorkoutMove}
            onAddWorkout={handleAddWorkout}
          />
        </main>
      </div>

      {modalState ? (
        <WorkoutModal
          workout={modalState.mode === "view" ? modalState.workout : null}
          day={modalState.day}
          mode={modalState.mode}
          isCompleted={modalState.mode === "view" && !!completed[modalState.workout.id]}
          settings={settings}
          onClose={handleCloseModal}
          onToggleComplete={handleToggleComplete}
          onSave={handleWorkoutSave}
          onDelete={handleWorkoutDelete}
          onImportHelpClick={() => setImportHelpOpen(true)}
        />
      ) : null}

      {settingsOpen ? (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onChange={handleSettingsChange}
          onOpenImportHelp={() => setImportHelpOpen(true)}
        />
      ) : null}

      {importHelpOpen ? <ImportHelpModal onClose={() => setImportHelpOpen(false)} /> : null}
    </>
  );
}
