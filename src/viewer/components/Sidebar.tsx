import { useMemo, useState } from "react";
import type { TrainingPlan, Sport } from "../../schema/training-plan";
import type { Settings } from "../stores/settings";
import { formatEventDate, getDaysToEvent, getSportIcon, getTodayISO } from "../lib/utils";
import { exportPlanToCalendar, exportAllWorkouts } from "../lib/export/index";
import { cx } from "../lib/cx";

interface Props {
  plan: TrainingPlan;
  settings: Settings;
  filters: { sport: string; status: string };
  completed: Record<string, boolean>;
  open: boolean;
  onFilterChange: (filters: { sport: string; status: string }) => void;
  onSettingsClick: () => void;
  onImportHelpClick: () => void;
}

const statusFilters: [string, string][] = [
  ["all", "All"],
  ["pending", "Pending"],
  ["completed", "Completed"],
];

export default function Sidebar({
  plan,
  settings,
  filters,
  completed,
  open,
  onFilterChange,
  onSettingsClick,
  onImportHelpClick,
}: Props) {
  // Calculate stats
  const stats = useMemo(() => {
    let totalWorkouts = 0;
    let completedCount = 0;
    let totalMinutes = 0;
    const sportHours: Record<string, number> = {
      swim: 0,
      bike: 0,
      run: 0,
      strength: 0,
      brick: 0,
      race: 0,
    };

    plan.weeks?.forEach((week) => {
      week.days?.forEach((day) => {
        day.workouts?.forEach((w) => {
          if (w.sport !== "rest") {
            totalWorkouts++;
            if (completed[w.id]) completedCount++;
            if (w.durationMinutes) {
              totalMinutes += w.durationMinutes;
              if (sportHours[w.sport] !== undefined) {
                sportHours[w.sport] += w.durationMinutes / 60;
              }
            }
          }
        });
      });
    });

    return {
      totalWorkouts,
      completedCount,
      totalHours: Math.round(totalMinutes / 60),
      sportHours,
      progress: totalWorkouts > 0 ? Math.round((completedCount / totalWorkouts) * 100) : 0,
    };
  }, [plan, completed]);

  const progressOffset = 377 - (stats.progress / 100) * 377;
  const daysToEvent = getDaysToEvent(plan.meta?.eventDate ?? "");

  // Which week today falls in, so the block list can show "done" / the
  // current week number / "—" for phases the same way the week cards do.
  const currentWeekNumber = useMemo(() => {
    const today = getTodayISO();
    const week = plan.weeks?.find((w) => today >= w.startDate && today <= w.endDate);
    return week?.weekNumber ?? null;
  }, [plan]);

  const availableSports = Object.entries(stats.sportHours)
    .filter(([, h]) => h > 0)
    .map(([sport]) => sport);

  function toggleSportFilter(sport: string) {
    if (filters.sport === sport) {
      onFilterChange({ ...filters, sport: "all" });
    } else {
      onFilterChange({ ...filters, sport });
    }
  }

  function setStatusFilter(status: string) {
    onFilterChange({ ...filters, status });
  }

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ message: string; isError: boolean } | null>(
    null
  );

  function handleExportCalendar() {
    setShowExportMenu(false);
    setExportStatus({ message: "Exporting calendar...", isError: false });

    const result = exportPlanToCalendar(plan);
    if (result.success) {
      setExportStatus({ message: `Downloaded ${result.filename}`, isError: false });
    } else {
      setExportStatus({ message: result.error || "Export failed", isError: true });
    }

    setTimeout(() => setExportStatus(null), 3000);
  }

  async function handleExportAllWorkouts(format: "zwo" | "fit" | "mrc") {
    setShowExportMenu(false);
    setExportStatus({ message: `Exporting ${format.toUpperCase()} files...`, isError: false });

    const result = await exportAllWorkouts(plan, format, settings);
    if (result.errors.length === 0) {
      setExportStatus({
        message: `Exported ${result.exported} workouts (${result.skipped} skipped)`,
        isError: false,
      });
    } else {
      setExportStatus({
        message: `Exported ${result.exported}, ${result.errors.length} errors`,
        isError: true,
      });
    }

    setTimeout(() => setExportStatus(null), 4000);
  }

  return (
    <aside className={cx("sidebar", open && "open")}>
      <div className="event-header">
        <h1 className="event-name">{plan.meta?.event ?? "Training Plan"}</h1>
        <div className="event-date">{formatEventDate(plan.meta?.eventDate ?? "")}</div>
        <div className="athlete-name">{plan.meta?.athlete ?? "Athlete"}</div>
      </div>

      {plan.phases?.length ? (
        <div className="blocks-section">
          <h3>Blocks</h3>
          <div className="blocks-list">
            {plan.phases.map((phase) => {
              const phaseName = phase.name.toLowerCase();
              const isCurrent =
                currentWeekNumber != null &&
                currentWeekNumber >= phase.startWeek &&
                currentWeekNumber <= phase.endWeek;
              const isDone = currentWeekNumber != null && currentWeekNumber > phase.endWeek;
              return (
                <div
                  key={phase.name + phase.startWeek}
                  className={cx("block-row", phaseName, isCurrent && "current")}
                >
                  <span className="block-name">
                    {phase.name} · W{phase.startWeek}–{phase.endWeek}
                  </span>
                  <span className="block-status">
                    {isDone ? "done" : isCurrent ? `W${currentWeekNumber}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="progress-section">
        <div className="progress-ring-container">
          <svg className="progress-ring" width="140" height="140">
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: "var(--accent)" }} />
                <stop offset="100%" style={{ stopColor: "var(--run)" }} />
              </linearGradient>
            </defs>
            <circle className="progress-ring-bg" cx={70} cy={70} r={60} />
            <circle
              className="progress-ring-fill"
              cx={70}
              cy={70}
              r={60}
              style={{ strokeDashoffset: progressOffset }}
            />
          </svg>
          <div className="progress-text">
            <div className="progress-percent">{stats.progress}%</div>
            <div className="progress-label">Complete</div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{plan.meta?.totalWeeks ?? 0}</div>
          <div className="stat-label">Weeks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalHours}</div>
          <div className="stat-label">Hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalWorkouts}</div>
          <div className="stat-label">Workouts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{daysToEvent}</div>
          <div className="stat-label">Days Left</div>
        </div>
      </div>

      <button className="settings-btn" onClick={onSettingsClick}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Settings
      </button>

      <div className="export-section">
        {exportStatus ? (
          <div className={cx("export-status", exportStatus.isError && "error")}>
            {exportStatus.message}
          </div>
        ) : null}
        <div className="export-main">
          <button className="export-main-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <div className="export-main-text">
              <span className="export-main-title">Export Plan</span>
              <span className="export-main-desc">Calendar, Zwift, Garmin, TrainerRoad</span>
            </div>
            <svg
              className={cx("dropdown-arrow", showExportMenu && "open")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showExportMenu ? (
            <div className="export-menu">
              <button className="export-option" onClick={handleExportCalendar}>
                <span className="export-icon calendar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <div>
                  <div className="export-name">Calendar (.ics)</div>
                  <div className="export-desc">Apple, Google, Outlook</div>
                </div>
              </button>
              <div className="export-divider"></div>
              <button className="export-option" onClick={() => handleExportAllWorkouts("zwo")}>
                <span className="export-icon">Z</span>
                <div>
                  <div className="export-name">Zwift (.zwo)</div>
                  <div className="export-desc">Bike & run workouts</div>
                </div>
              </button>
              <button className="export-option" onClick={() => handleExportAllWorkouts("fit")}>
                <span className="export-icon">G</span>
                <div>
                  <div className="export-name">Garmin (.fit)</div>
                  <div className="export-desc">All workout types</div>
                </div>
              </button>
              <button className="export-option" onClick={() => handleExportAllWorkouts("mrc")}>
                <span className="export-icon">E</span>
                <div>
                  <div className="export-name">ERG/MRC (.mrc)</div>
                  <div className="export-desc">Bike workouts only</div>
                </div>
              </button>
            </div>
          ) : null}
        </div>
        <button className="import-help-link" onClick={onImportHelpClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          How to import workouts in training apps
        </button>
      </div>

      <div className="sport-stats">
        <div className="sport-stats-header">
          <h3>Filter by Sport</h3>
          {filters.sport !== "all" ? (
            <button
              className="clear-filter"
              onClick={() => onFilterChange({ ...filters, sport: "all" })}
            >
              Clear
            </button>
          ) : null}
        </div>
        {availableSports.map((sport) => (
          <button
            key={sport}
            className={cx("sport-stat", sport, filters.sport === sport && "active")}
            onClick={() => toggleSportFilter(sport)}
          >
            <div className={cx("sport-icon", sport)}>{getSportIcon(sport as Sport)}</div>
            <div className="sport-info">
              <div className="sport-name">{sport.charAt(0).toUpperCase() + sport.slice(1)}</div>
              <div className="sport-hours">{stats.sportHours[sport].toFixed(1)} hours</div>
            </div>
            {filters.sport === sport ? <div className="check-icon">✓</div> : null}
          </button>
        ))}
      </div>

      <div className="filters-section">
        <h3>Filter by Status</h3>
        <div className="filter-group">
          {statusFilters.map(([value, label]) => (
            <button
              key={value}
              className={cx("filter-chip", filters.status === value && "active")}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
