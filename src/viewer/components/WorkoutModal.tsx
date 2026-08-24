import { useEffect, useState } from "react";
import type { Workout, TrainingDay, Sport, WorkoutType } from "../../schema/training-plan";
import type { Settings } from "../stores/settings";
import { formatDuration, formatDistance, formatDate, getZoneInfo, formatRange } from "../lib/utils";
import {
  exportWorkout,
  getAvailableFormats,
  isZwoSupported,
  isFitSupported,
  isErgSupported,
  type ExportFormat,
} from "../lib/export/index";
import { cx } from "../lib/cx";

type Mode = "view" | "edit" | "create";

interface Props {
  workout: Workout | null; // null for create mode
  day: TrainingDay;
  settings: Settings;
  mode?: Mode;
  isCompleted?: boolean;
  onClose: () => void;
  onToggleComplete: (workoutId: string) => void;
  onSave: (workout: Partial<Workout>) => void;
  onDelete: (workoutId: string) => void;
  onImportHelpClick: () => void;
}

const sports: Sport[] = ["swim", "bike", "run", "strength", "brick", "race", "rest"];
const workoutTypes: WorkoutType[] = [
  "rest",
  "recovery",
  "endurance",
  "tempo",
  "threshold",
  "intervals",
  "vo2max",
  "sprint",
  "race",
  "brick",
  "technique",
  "openwater",
  "hills",
  "long",
];

export default function WorkoutModal({
  workout,
  day,
  settings,
  mode = "view",
  isCompleted = false,
  onClose,
  onToggleComplete,
  onSave,
  onDelete,
  onImportHelpClick,
}: Props) {
  const [currentMode, setCurrentMode] = useState<Mode>(mode);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ message: string; isError: boolean } | null>(
    null
  );

  // Editable fields
  const [editSport, setEditSport] = useState<Sport>(workout?.sport || "run");
  const [editType, setEditType] = useState<WorkoutType>(workout?.type || "endurance");
  const [editName, setEditName] = useState(workout?.name || "");
  const [editDescription, setEditDescription] = useState(workout?.description || "");
  const [editDuration, setEditDuration] = useState(workout?.durationMinutes?.toString() || "");
  const [editDistance, setEditDistance] = useState(workout?.distanceMeters?.toString() || "");
  const [editZone, setEditZone] = useState(workout?.primaryZone || "");
  const [editStructure, setEditStructure] = useState(workout?.humanReadable || "");

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else if (currentMode !== "view") {
          setCurrentMode("view");
          if (!workout) onClose();
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [showDeleteConfirm, currentMode, workout, onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("modal-overlay")) {
      onClose();
    }
  }

  function startEdit() {
    setEditSport(workout?.sport || "run");
    setEditType(workout?.type || "endurance");
    setEditName(workout?.name || "");
    setEditDescription(workout?.description || "");
    setEditDuration(workout?.durationMinutes?.toString() || "");
    setEditDistance(workout?.distanceMeters?.toString() || "");
    setEditZone(workout?.primaryZone || "");
    setEditStructure(workout?.humanReadable || "");
    setCurrentMode("edit");
  }

  function cancelEdit() {
    if (mode === "create") {
      onClose();
    } else {
      setCurrentMode("view");
    }
  }

  function handleSave() {
    const updates: Partial<Workout> = {
      sport: editSport,
      type: editType,
      name: editName,
      description: editDescription,
      durationMinutes: editDuration ? parseInt(editDuration) : undefined,
      distanceMeters: editDistance ? parseInt(editDistance) : undefined,
      primaryZone: editZone || undefined,
      humanReadable: editStructure || undefined,
    };
    onSave(updates);
    if (mode !== "create") {
      setCurrentMode("view");
    }
  }

  function handleDelete() {
    if (workout) {
      onDelete(workout.id);
    }
  }

  async function handleExport(format: ExportFormat) {
    if (!workout) return;
    setShowExportMenu(false);
    setExportStatus({ message: "Exporting...", isError: false });

    const result = await exportWorkout(workout, format, settings);

    if (result.success) {
      setExportStatus({ message: `Downloaded ${result.filename}`, isError: false });
    } else {
      setExportStatus({ message: result.error || "Export failed", isError: true });
    }

    setTimeout(() => setExportStatus(null), 3000);
  }

  // Check available export formats for current workout
  const availableFormats = workout ? getAvailableFormats(workout.sport) : [];
  const canExport = availableFormats.length > 0;

  // Derive displayed workout (for view mode)
  const displayWorkout: Workout =
    workout ||
    ({
      id: "",
      sport: editSport,
      type: editType,
      name: editName,
      description: editDescription,
      durationMinutes: editDuration ? parseInt(editDuration) : undefined,
      distanceMeters: editDistance ? parseInt(editDistance) : undefined,
      primaryZone: editZone,
      humanReadable: editStructure,
      completed: false,
    } as Workout);

  return (
    <div
      className="modal-overlay active"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="workout-modal">
        <div className="modal-header">
          {currentMode === "view" ? (
            <div>
              <div className={cx("modal-sport-badge", displayWorkout.sport)}>
                {displayWorkout.type && displayWorkout.type !== displayWorkout.sport
                  ? `${displayWorkout.sport.toUpperCase()} · ${displayWorkout.type.toUpperCase()}`
                  : displayWorkout.sport.toUpperCase()}
              </div>
              <h2 className="modal-title">{displayWorkout.name}</h2>
              <div className="modal-date">{formatDate(day.date)}</div>
            </div>
          ) : (
            <div>
              <h2 className="modal-title">
                {currentMode === "create" ? "New Workout" : "Edit Workout"}
              </h2>
              <div className="modal-date">{formatDate(day.date)}</div>
            </div>
          )}
          <div className="modal-header-actions">
            {currentMode === "view" ? (
              <button className="modal-edit-btn" onClick={startEdit}>
                Edit
              </button>
            ) : null}
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="modal-body">
          {currentMode === "view" ? (
            <>
              {/* View Mode */}
              <div className="modal-stats">
                {displayWorkout.durationMinutes ? (
                  <div className="modal-stat">
                    <div className="modal-stat-value">
                      {formatDuration(displayWorkout.durationMinutes)}
                    </div>
                    <div className="modal-stat-label">Duration</div>
                  </div>
                ) : null}
                {displayWorkout.distanceMeters ? (
                  <div className="modal-stat">
                    <div className="modal-stat-value">
                      {formatDistance(
                        displayWorkout.distanceMeters,
                        displayWorkout.sport,
                        settings
                      )}
                    </div>
                    <div className="modal-stat-label">Distance</div>
                  </div>
                ) : null}
                {displayWorkout.primaryZone ? (
                  <div className="modal-stat">
                    <div className="modal-stat-value">
                      {getZoneInfo(displayWorkout.sport, displayWorkout.primaryZone, settings)}
                    </div>
                    <div className="modal-stat-label">Target Zone</div>
                  </div>
                ) : null}
                {displayWorkout.rpe ? (
                  <div className="modal-stat">
                    <div className="modal-stat-value">{displayWorkout.rpe}</div>
                    <div className="modal-stat-label">RPE Target</div>
                  </div>
                ) : null}
              </div>

              {displayWorkout.targetPace ||
              displayWorkout.targetHR ||
              displayWorkout.targetPower ? (
                <div className="modal-tags">
                  {displayWorkout.targetPace ? (
                    <span className="modal-tag">{formatRange(displayWorkout.targetPace)}</span>
                  ) : null}
                  {displayWorkout.targetHR ? (
                    <span className="modal-tag">
                      HR {formatRange(displayWorkout.targetHR, " bpm")}
                    </span>
                  ) : null}
                  {displayWorkout.targetPower ? (
                    <span className="modal-tag">
                      {formatRange(displayWorkout.targetPower, "W")}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {displayWorkout.description ? (
                <div className="modal-section">
                  <h4 className="modal-section-title">Description</h4>
                  <p className="modal-description">{displayWorkout.description}</p>
                </div>
              ) : null}

              {displayWorkout.humanReadable ? (
                <div className="modal-section">
                  <h4 className="modal-section-title">Workout Structure</h4>
                  <pre className="workout-structure">
                    {displayWorkout.humanReadable.replace(/\\n/g, "\n")}
                  </pre>
                </div>
              ) : null}
            </>
          ) : (
            <>
              {/* Edit/Create Mode */}
              <div className="form-grid">
                <div className="form-row">
                  <label className="form-label" htmlFor="edit-sport">
                    Sport
                  </label>
                  <select
                    id="edit-sport"
                    className="form-select"
                    value={editSport}
                    onChange={(e) => setEditSport(e.target.value as Sport)}
                  >
                    {sports.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label" htmlFor="edit-type">
                    Type
                  </label>
                  <select
                    id="edit-type"
                    className="form-select"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as WorkoutType)}
                  >
                    {workoutTypes.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row full">
                <label className="form-label" htmlFor="edit-name">
                  Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Easy Run"
                />
              </div>

              <div className="form-row full">
                <label className="form-label" htmlFor="edit-description">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  className="form-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Conversational pace, focus on form"
                  rows={2}
                ></textarea>
              </div>

              <div className="form-grid">
                <div className="form-row">
                  <label className="form-label" htmlFor="edit-duration">
                    Duration (minutes)
                  </label>
                  <input
                    id="edit-duration"
                    type="number"
                    className="form-input"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                    placeholder="60"
                  />
                </div>

                <div className="form-row">
                  <label className="form-label" htmlFor="edit-distance">
                    Distance (meters)
                  </label>
                  <input
                    id="edit-distance"
                    type="number"
                    className="form-input"
                    value={editDistance}
                    onChange={(e) => setEditDistance(e.target.value)}
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="form-row full">
                <label className="form-label" htmlFor="edit-zone">
                  Target Zone
                </label>
                <input
                  id="edit-zone"
                  type="text"
                  className="form-input"
                  value={editZone}
                  onChange={(e) => setEditZone(e.target.value)}
                  placeholder="Zone 2"
                />
              </div>

              <div className="form-row full">
                <label className="form-label" htmlFor="edit-structure">
                  Workout Structure
                </label>
                <textarea
                  id="edit-structure"
                  className="form-textarea mono"
                  value={editStructure}
                  onChange={(e) => setEditStructure(e.target.value)}
                  placeholder={
                    "Warm-up: 10min easy\nMain: 4x1km @ threshold\nCool-down: 10min easy"
                  }
                  rows={5}
                ></textarea>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {currentMode === "view" ? (
            <>
              <div className="footer-left">
                <button
                  className="icon-btn delete"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
                {canExport ? (
                  <div className="export-dropdown">
                    <button
                      className="icon-btn export"
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      title="Export"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    {showExportMenu ? (
                      <div className="export-menu">
                        {isZwoSupported(displayWorkout.sport) ? (
                          <button className="export-option" onClick={() => handleExport("zwo")}>
                            <span className="export-icon">Z</span>
                            <div className="export-info">
                              <div className="export-name">Zwift (.zwo)</div>
                              <div className="export-desc">For Zwift indoor training</div>
                            </div>
                          </button>
                        ) : null}
                        {isFitSupported(displayWorkout.sport) ? (
                          <button className="export-option" onClick={() => handleExport("fit")}>
                            <span className="export-icon">G</span>
                            <div className="export-info">
                              <div className="export-name">Garmin (.fit)</div>
                              <div className="export-desc">For Garmin Connect</div>
                            </div>
                          </button>
                        ) : null}
                        {isErgSupported(displayWorkout.sport) ? (
                          <button className="export-option" onClick={() => handleExport("mrc")}>
                            <span className="export-icon">E</span>
                            <div className="export-info">
                              <div className="export-name">ERG/MRC (.mrc)</div>
                              <div className="export-desc">For TrainerRoad, etc.</div>
                            </div>
                          </button>
                        ) : null}
                        <div className="export-divider"></div>
                        <button className="export-help-link" onClick={onImportHelpClick}>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          How to import files
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="footer-right">
                {exportStatus ? (
                  <div className={cx("export-status", exportStatus.isError && "error")}>
                    {exportStatus.message}
                  </div>
                ) : null}
                <button
                  className={cx("complete-btn", isCompleted ? "unmark" : "mark")}
                  onClick={() => onToggleComplete(displayWorkout.id)}
                >
                  {isCompleted ? (
                    <>
                      <span>↩</span> Mark Incomplete
                    </>
                  ) : (
                    <>
                      <span>✓</span> Mark Complete
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <button className="cancel-btn" onClick={cancelEdit}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSave} disabled={!editName}>
                {currentMode === "create" ? "Add Workout" : "Save Changes"}
              </button>
            </>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm ? (
          <div className="confirm-overlay">
            <div className="confirm-dialog">
              <p>Delete this workout?</p>
              <div className="confirm-actions">
                <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </button>
                <button className="delete-btn" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
