import { useEffect, useRef, useState } from "react";
import {
  type Settings,
  type Theme,
  recalculateHrZones,
  recalculatePowerZones,
  recalculateRunPaceZones,
  recalculateSwimPaceZones,
} from "../stores/settings";
import { cx } from "../lib/cx";
import packageJson from "../../../package.json";

const { version } = packageJson;

interface Props {
  settings: Settings;
  onClose: () => void;
  onChange: (settings: Settings) => void;
  onOpenImportHelp: () => void;
}

const tabs: [string, string][] = [
  ["general", "General"],
  ["run", "Run"],
  ["bike", "Bike"],
  ["swim", "Swim"],
  ["data", "Data"],
  ["about", "About"],
];

export default function SettingsModal({ settings, onClose, onChange, onOpenImportHelp }: Props) {
  const [activeTab, setActiveTab] = useState("general");
  const [localSettings, setLocalSettings] = useState<Settings>(() =>
    JSON.parse(JSON.stringify(settings))
  );
  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).classList.contains("modal-overlay")) {
      onClose();
    }
  }

  // Update local state only - matches fields that only persist once an
  // explicit "Recalculate" action commits them.
  function updateLocal(updater: (s: Settings) => Settings) {
    setLocalSettings((prev) => updater(prev));
  }

  // Update local state and immediately lift it up to be persisted.
  function updateAndSave(updater: (s: Settings) => Settings) {
    setLocalSettings((prev) => {
      const next = updater(prev);
      onChange(next);
      return next;
    });
  }

  function setTheme(theme: Theme) {
    updateAndSave((s) => ({ ...s, theme }));
  }

  function recalcHr(sport: "run" | "bike") {
    updateAndSave((s) => ({
      ...s,
      [sport]: { ...s[sport], hrZones: recalculateHrZones(s[sport].lthr) },
    }));
  }

  function recalcPower() {
    updateAndSave((s) => ({
      ...s,
      bike: { ...s.bike, powerZones: recalculatePowerZones(s.bike.ftp) },
    }));
  }

  function recalcRunPace() {
    updateAndSave((s) => ({
      ...s,
      run: { ...s.run, paceZones: recalculateRunPaceZones(s.run.thresholdPace) },
    }));
  }

  function recalcSwimPace() {
    updateAndSave((s) => ({
      ...s,
      swim: { ...s.swim, paceZones: recalculateSwimPaceZones(s.swim.css) },
    }));
  }

  function exportData() {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        data[key] = localStorage.getItem(key) || "";
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `training-plan-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (typeof data !== "object" || data === null) {
        throw new Error("Invalid file format");
      }

      // Clear and restore localStorage
      localStorage.clear();
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") {
          localStorage.setItem(key, value);
        }
      }

      setImportStatus({ message: "Data restored! Reloading...", isError: false });
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setImportStatus({
        message: "Could not read file. Make sure it's a valid backup.",
        isError: true,
      });
      setTimeout(() => setImportStatus(null), 4000);
    }

    // Reset file input
    e.target.value = "";
  }

  function clearAllData() {
    if (
      confirm("This will delete all your settings, completed workouts, and changes. Are you sure?")
    ) {
      localStorage.clear();
      window.location.reload();
    }
  }

  return (
    <div
      className="modal-overlay scrollable active"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className="modal settings-modal">
        <div className="modal-fixed-header">
          <div className="modal-header">
            <h2 className="modal-title">Settings</h2>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="settings-tabs">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                className={cx("settings-tab", activeTab === id && "active")}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {/* General Tab */}
          {activeTab === "general" && (
            <>
              <div className="settings-section">
                <h4 className="settings-section-title">Appearance</h4>
                <div className="theme-toggle">
                  <button
                    className={cx("theme-btn", localSettings.theme === "light" && "active")}
                    onClick={() => setTheme("light")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    Light
                  </button>
                  <button
                    className={cx("theme-btn", localSettings.theme === "dark" && "active")}
                    onClick={() => setTheme("dark")}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                    Dark
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Distance Units</h4>
                <div className="settings-row">
                  <span className="settings-label">Swim</span>
                  <select
                    className="settings-select"
                    value={localSettings.units.swim}
                    onChange={(e) =>
                      updateAndSave((s) => ({
                        ...s,
                        units: { ...s.units, swim: e.target.value as Settings["units"]["swim"] },
                      }))
                    }
                  >
                    <option value="meters">Meters</option>
                    <option value="yards">Yards</option>
                  </select>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Bike</span>
                  <select
                    className="settings-select"
                    value={localSettings.units.bike}
                    onChange={(e) =>
                      updateAndSave((s) => ({
                        ...s,
                        units: { ...s.units, bike: e.target.value as Settings["units"]["bike"] },
                      }))
                    }
                  >
                    <option value="kilometers">Kilometers</option>
                    <option value="miles">Miles</option>
                  </select>
                </div>
                <div className="settings-row">
                  <span className="settings-label">Run</span>
                  <select
                    className="settings-select"
                    value={localSettings.units.run}
                    onChange={(e) =>
                      updateAndSave((s) => ({
                        ...s,
                        units: { ...s.units, run: e.target.value as Settings["units"]["run"] },
                      }))
                    }
                  >
                    <option value="kilometers">Kilometers</option>
                    <option value="miles">Miles</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Calendar</h4>
                <div className="settings-row">
                  <span className="settings-label">First day of week</span>
                  <select
                    className="settings-select"
                    value={localSettings.firstDayOfWeek}
                    onChange={(e) =>
                      updateAndSave((s) => ({
                        ...s,
                        firstDayOfWeek: e.target.value as Settings["firstDayOfWeek"],
                      }))
                    }
                  >
                    <option value="monday">Monday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Run Tab */}
          {activeTab === "run" && (
            <>
              <div className="settings-section">
                <h4 className="settings-section-title">Heart Rate Zones</h4>
                <div className="threshold-row">
                  <span className="threshold-label">Run LTHR</span>
                  <input
                    type="number"
                    className="threshold-input"
                    value={localSettings.run.lthr}
                    min={100}
                    max={220}
                    onChange={(e) =>
                      updateLocal((s) => ({
                        ...s,
                        run: { ...s.run, lthr: Number(e.target.value) },
                      }))
                    }
                  />
                  <button className="recalc-btn" onClick={() => recalcHr("run")}>
                    Recalculate
                  </button>
                </div>
                <div className="zones-grid">
                  <div className="zone-row header">
                    <span>Zone</span>
                    <span>Name</span>
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  {localSettings.run.hrZones.map((zone, i) => (
                    <div className="zone-row" key={zone.zone}>
                      <span className={`zone-badge z${zone.zone}`}>Z{zone.zone}</span>
                      <span className="zone-name">{zone.name}</span>
                      <input
                        type="number"
                        className="zone-input"
                        value={zone.low}
                        onChange={(e) =>
                          updateLocal((s) => {
                            const hrZones = [...s.run.hrZones];
                            hrZones[i] = { ...hrZones[i], low: Number(e.target.value) };
                            return { ...s, run: { ...s.run, hrZones } };
                          })
                        }
                        onBlur={() => onChange(localSettings)}
                      />
                      <input
                        type="number"
                        className="zone-input"
                        value={zone.high}
                        onChange={(e) =>
                          updateLocal((s) => {
                            const hrZones = [...s.run.hrZones];
                            hrZones[i] = { ...hrZones[i], high: Number(e.target.value) };
                            return { ...s, run: { ...s.run, hrZones } };
                          })
                        }
                        onBlur={() => onChange(localSettings)}
                      />
                    </div>
                  ))}
                </div>
                <details className="help-details">
                  <summary>How to find your LTHR</summary>
                  <div className="help-content">
                    <p>
                      <strong>30-Minute Test:</strong>
                    </p>
                    <ol>
                      <li>Warm up for 15 minutes</li>
                      <li>Run as hard as you can sustain for 30 minutes</li>
                      <li>Your average HR for the last 20 minutes is your LTHR</li>
                    </ol>
                  </div>
                </details>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Pace Zones</h4>
                <div className="threshold-row">
                  <span className="threshold-label">Threshold Pace</span>
                  <input
                    type="text"
                    className="threshold-input"
                    value={localSettings.run.thresholdPace}
                    placeholder="4:30"
                    onChange={(e) =>
                      updateLocal((s) => ({
                        ...s,
                        run: { ...s.run, thresholdPace: e.target.value },
                      }))
                    }
                  />
                  <button className="recalc-btn" onClick={recalcRunPace}>
                    Recalculate
                  </button>
                </div>
                <div className="zones-grid">
                  <div className="zone-row header">
                    <span>Zone</span>
                    <span>Name</span>
                    <span>Pace/km</span>
                  </div>
                  {localSettings.run.paceZones.map((zone, i) => (
                    <div className="zone-row" key={zone.zone}>
                      <span className={`zone-badge z${i + 1}`}>{zone.zone}</span>
                      <span className="zone-name">{zone.name}</span>
                      <input
                        type="text"
                        className="pace-input"
                        value={zone.pace}
                        onChange={(e) =>
                          updateLocal((s) => {
                            const paceZones = [...s.run.paceZones];
                            paceZones[i] = { ...paceZones[i], pace: e.target.value };
                            return { ...s, run: { ...s.run, paceZones } };
                          })
                        }
                        onBlur={() => onChange(localSettings)}
                      />
                    </div>
                  ))}
                </div>
                <details className="help-details">
                  <summary>How to find your Threshold Pace</summary>
                  <div className="help-content">
                    <p>
                      <strong>Option 1: Race-Based</strong>
                    </p>
                    <ul>
                      <li>Recent 5K race pace + 15-20 sec/km</li>
                      <li>Recent 10K race pace + 5-10 sec/km</li>
                    </ul>
                    <p>
                      <strong>Option 2: 30-Minute Test</strong>
                    </p>
                    <p>Run 30 minutes at max sustainable effort. Average pace = threshold.</p>
                  </div>
                </details>
              </div>
            </>
          )}

          {/* Bike Tab */}
          {activeTab === "bike" && (
            <>
              <div className="settings-section">
                <h4 className="settings-section-title">Heart Rate Zones</h4>
                <div className="threshold-row">
                  <span className="threshold-label">Bike LTHR</span>
                  <input
                    type="number"
                    className="threshold-input"
                    value={localSettings.bike.lthr}
                    min={100}
                    max={220}
                    onChange={(e) =>
                      updateLocal((s) => ({
                        ...s,
                        bike: { ...s.bike, lthr: Number(e.target.value) },
                      }))
                    }
                  />
                  <button className="recalc-btn" onClick={() => recalcHr("bike")}>
                    Recalculate
                  </button>
                </div>
                <div className="zones-grid">
                  <div className="zone-row header">
                    <span>Zone</span>
                    <span>Name</span>
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  {localSettings.bike.hrZones.map((zone, i) => (
                    <div className="zone-row" key={zone.zone}>
                      <span className={`zone-badge z${zone.zone}`}>Z{zone.zone}</span>
                      <span className="zone-name">{zone.name}</span>
                      <input
                        type="number"
                        className="zone-input"
                        value={zone.low}
                        onChange={(e) =>
                          updateLocal((s) => {
                            const hrZones = [...s.bike.hrZones];
                            hrZones[i] = { ...hrZones[i], low: Number(e.target.value) };
                            return { ...s, bike: { ...s.bike, hrZones } };
                          })
                        }
                        onBlur={() => onChange(localSettings)}
                      />
                      <input
                        type="number"
                        className="zone-input"
                        value={zone.high}
                        onChange={(e) =>
                          updateLocal((s) => {
                            const hrZones = [...s.bike.hrZones];
                            hrZones[i] = { ...hrZones[i], high: Number(e.target.value) };
                            return { ...s, bike: { ...s.bike, hrZones } };
                          })
                        }
                        onBlur={() => onChange(localSettings)}
                      />
                    </div>
                  ))}
                </div>
                <details className="help-details">
                  <summary>How to find your LTHR</summary>
                  <div className="help-content">
                    <p>
                      <strong>30-Minute Test:</strong>
                    </p>
                    <ol>
                      <li>Warm up for 15 minutes</li>
                      <li>Bike as hard as you can sustain for 30 minutes</li>
                      <li>Your average HR for the last 20 minutes is your LTHR</li>
                    </ol>
                    <p className="help-note">Bike LTHR is typically 5-10 bpm lower than run.</p>
                  </div>
                </details>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Power Zones</h4>
                <div className="threshold-row">
                  <span className="threshold-label">FTP (watts)</span>
                  <input
                    type="number"
                    className="threshold-input"
                    value={localSettings.bike.ftp}
                    min={50}
                    max={500}
                    onChange={(e) =>
                      updateLocal((s) => ({
                        ...s,
                        bike: { ...s.bike, ftp: Number(e.target.value) },
                      }))
                    }
                  />
                  <button className="recalc-btn" onClick={recalcPower}>
                    Recalculate
                  </button>
                </div>
                <div className="zones-grid">
                  <div className="zone-row header">
                    <span>Zone</span>
                    <span>Name</span>
                    <span>Low W</span>
                    <span>High W</span>
                  </div>
                  {localSettings.bike.powerZones.map((zone, i) => (
                    <div className="zone-row" key={zone.zone}>
                      <span className={`zone-badge z${zone.zone}`}>Z{zone.zone}</span>
                      <span className="zone-name">{zone.name}</span>
                      <input
                        type="number"
                        className="zone-input"
                        value={zone.low}
                        onChange={(e) =>
                          updateLocal((s) => {
                            const powerZones = [...s.bike.powerZones];
                            powerZones[i] = { ...powerZones[i], low: Number(e.target.value) };
                            return { ...s, bike: { ...s.bike, powerZones } };
                          })
                        }
                        onBlur={() => onChange(localSettings)}
                      />
                      <input
                        type="number"
                        className="zone-input"
                        value={zone.high}
                        onChange={(e) =>
                          updateLocal((s) => {
                            const powerZones = [...s.bike.powerZones];
                            powerZones[i] = { ...powerZones[i], high: Number(e.target.value) };
                            return { ...s, bike: { ...s.bike, powerZones } };
                          })
                        }
                        onBlur={() => onChange(localSettings)}
                      />
                    </div>
                  ))}
                </div>
                <details className="help-details">
                  <summary>How to find your FTP</summary>
                  <div className="help-content">
                    <p>
                      <strong>20-Minute Test:</strong>
                    </p>
                    <ol>
                      <li>Warm up for 20 minutes including a few hard efforts</li>
                      <li>Ride as hard as you can sustain for 20 minutes</li>
                      <li>FTP = Average power × 0.95</li>
                    </ol>
                    <p>
                      <strong>Ramp Test:</strong> Most trainer apps (Zwift, TrainerRoad) have
                      built-in FTP tests.
                    </p>
                  </div>
                </details>
              </div>
            </>
          )}

          {/* Swim Tab */}
          {activeTab === "swim" && (
            <div className="settings-section">
              <h4 className="settings-section-title">Pace Zones</h4>
              <div className="threshold-row">
                <span className="threshold-label">CSS (per 100m)</span>
                <input
                  type="text"
                  className="threshold-input"
                  value={localSettings.swim.css}
                  placeholder="1:45"
                  onChange={(e) =>
                    updateLocal((s) => ({ ...s, swim: { ...s.swim, css: e.target.value } }))
                  }
                />
                <button className="recalc-btn" onClick={recalcSwimPace}>
                  Recalculate
                </button>
              </div>
              <div className="zones-grid">
                <div className="zone-row header">
                  <span>Zone</span>
                  <span>Name</span>
                  <span>Offset</span>
                  <span>Pace/100</span>
                </div>
                {localSettings.swim.paceZones.map((zone, i) => (
                  <div className="zone-row" key={zone.zone}>
                    <span className={`zone-badge z${zone.zone}`}>Z{zone.zone}</span>
                    <span className="zone-name">{zone.name}</span>
                    <span className="zone-name">
                      {(zone.offset ?? 0) >= 0 ? "+" : ""}
                      {zone.offset}s
                    </span>
                    <input
                      type="text"
                      className="pace-input"
                      value={zone.pace}
                      onChange={(e) =>
                        updateLocal((s) => {
                          const paceZones = [...s.swim.paceZones];
                          paceZones[i] = { ...paceZones[i], pace: e.target.value };
                          return { ...s, swim: { ...s.swim, paceZones } };
                        })
                      }
                      onBlur={() => onChange(localSettings)}
                    />
                  </div>
                ))}
              </div>
              <details className="help-details">
                <summary>How to find your CSS</summary>
                <div className="help-content">
                  <p>
                    <strong>CSS Test (Critical Swim Speed):</strong>
                  </p>
                  <ol>
                    <li>Warm up for 10 minutes</li>
                    <li>Swim 400m all-out, record time (T400)</li>
                    <li>Rest 5-10 minutes</li>
                    <li>Swim 200m all-out, record time (T200)</li>
                    <li>CSS = (T400 - T200) ÷ 2 = pace per 100m</li>
                  </ol>
                  <p>
                    <strong>Example:</strong> 400m in 6:40 (400s), 200m in 3:00 (180s)
                    <br />
                    CSS = (400 - 180) ÷ 2 = 110 sec/100m = 1:50/100m
                  </p>
                </div>
              </details>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === "data" && (
            <>
              <div className="settings-section">
                <h4 className="settings-section-title">Your Data</h4>
                <div className="data-explainer">
                  <p>
                    Your training data is stored <strong>only on this device</strong>, in your
                    browser's local storage. This includes your settings, completed workouts, and
                    any changes you've made to your plan.
                  </p>
                  <p>
                    If you clear your browser data, switch browsers, or use a different device, your
                    progress won't be there. Use the backup feature below to save your data and
                    restore it later.
                  </p>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Import to Other Apps</h4>
                <div className="data-action">
                  <div className="data-action-info">
                    <span className="data-action-title">Import Help</span>
                    <span className="data-action-desc">
                      Learn how to import exported workouts into Zwift, Garmin, TrainerRoad, and
                      more.
                    </span>
                  </div>
                  <button className="data-btn help" onClick={onOpenImportHelp}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    View Guide
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Backup & Restore</h4>

                <div className="data-action">
                  <div className="data-action-info">
                    <span className="data-action-title">Export Backup</span>
                    <span className="data-action-desc">
                      Download a file containing all your data. Keep it somewhere safe.
                    </span>
                  </div>
                  <button className="data-btn export" onClick={exportData}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export
                  </button>
                </div>

                <div className="data-action">
                  <div className="data-action-info">
                    <span className="data-action-title">Import Backup</span>
                    <span className="data-action-desc">
                      Restore from a backup file. This will replace your current data.
                    </span>
                  </div>
                  <button className="data-btn import" onClick={handleImportClick}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Import
                  </button>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                </div>

                {importStatus ? (
                  <div className={cx("import-status", importStatus.isError && "error")}>
                    {importStatus.message}
                  </div>
                ) : null}
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Danger Zone</h4>
                <div className="data-action danger">
                  <div className="data-action-info">
                    <span className="data-action-title">Clear All Data</span>
                    <span className="data-action-desc">
                      Delete everything and start fresh. This cannot be undone.
                    </span>
                  </div>
                  <button className="data-btn danger" onClick={clearAllData}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Clear
                  </button>
                </div>
              </div>
            </>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <>
              <div className="settings-section">
                <div className="about-header">
                  <h3 className="about-title">Claude Coach</h3>
                  <span className="about-version">v{version}</span>
                </div>
                <p className="about-description">
                  Personalized training plans for triathlons, marathons, and endurance events. Built
                  with Claude.
                </p>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Created By</h4>
                <div className="about-author">
                  <span className="author-name">Felix Rieseberg</span>
                  <div className="author-links">
                    <a
                      href="https://felixrieseberg.com"
                      target="_blank"
                      rel="noopener"
                      className="author-link"
                    >
                      felixrieseberg.com
                    </a>
                    <span className="author-separator">·</span>
                    <a
                      href="https://twitter.com/felixrieseberg"
                      target="_blank"
                      rel="noopener"
                      className="author-link"
                    >
                      @felixrieseberg
                    </a>
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">Links</h4>
                <div className="about-links">
                  <a
                    href="https://github.com/felixrieseberg/claude-coach"
                    target="_blank"
                    rel="noopener"
                    className="about-link"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub Repository
                  </a>
                </div>
              </div>

              <div className="settings-section">
                <h4 className="settings-section-title">License</h4>
                <p className="about-license">MIT License. Free to use, modify, and distribute.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
