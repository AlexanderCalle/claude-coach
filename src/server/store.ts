/**
 * Persistence for the hosted plan server.
 *
 * Deliberately simple - one plan document plus an append-only history log,
 * both plain files on whatever volume `DATA_DIR` points at. A training plan
 * is a single small JSON document with one writer (the athlete's Claude
 * session, interactively or via a scheduled check-in) and one reader (the
 * viewer page) - there's no concurrent-write or query complexity here that
 * would justify a database.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";

export interface HistoryEntry {
  timestamp: string;
  source?: string;
  summary?: string;
}

const MAX_HISTORY_ENTRIES = 200;

function dataDir(): string {
  return process.env.DATA_DIR || join(process.cwd(), "data");
}

function planPath(): string {
  return join(dataDir(), "plan.json");
}

function historyPath(): string {
  return join(dataDir(), "history.jsonl");
}

function ensureDataDir(): void {
  const dir = dataDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/** Write `content` to `path` atomically (write to a temp file, then rename). */
function writeFileAtomic(path: string, content: string): void {
  const tmpPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, path);
}

/** Raw current plan JSON text, or null if nothing has been published yet. */
export function readPlan(): string | null {
  try {
    return readFileSync(planPath(), "utf-8");
  } catch {
    return null;
  }
}

export function readHistory(limit = 20): HistoryEntry[] {
  let raw: string;
  try {
    raw = readFileSync(historyPath(), "utf-8");
  } catch {
    return [];
  }
  const lines = raw.split("\n").filter(Boolean);
  return lines
    .slice(-limit)
    .reverse()
    .map((line) => JSON.parse(line) as HistoryEntry);
}

/** Persist a new plan document and append a history entry describing the update. */
export function writePlan(planJson: string, meta: { source?: string; summary?: string }): void {
  ensureDataDir();
  writeFileAtomic(planPath(), planJson);

  const entry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    source: meta.source,
    summary: meta.summary,
  };

  let existing: string;
  try {
    existing = readFileSync(historyPath(), "utf-8");
  } catch {
    existing = "";
  }
  const lines = existing.split("\n").filter(Boolean);
  lines.push(JSON.stringify(entry));
  // Cap growth - this is a rolling log for display, not a full audit trail.
  const trimmed = lines.slice(-MAX_HISTORY_ENTRIES);
  writeFileAtomic(historyPath(), trimmed.join("\n") + "\n");
}
