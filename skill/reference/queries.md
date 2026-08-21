# COROS MCP Data for Athlete Assessment

Pull athlete data using the `Coros_MCP` tools below. Unlike a database, these tools return raw records, not aggregates — you group, sum, and average them yourself as you read through the results. Dates for these tools are `yyyyMMdd`.

**Sport codes for this skill:**

- Running: `[100, 101, 102, 103]` (outdoor/indoor/trail/track run). Add `104` (hike) if the athlete uses hiking as cross-training.
- Strength: `[402]` (strength). Add `400` (gym cardio) if you want to catch circuit/cardio-style gym sessions too.

**Pagination note:** `querySportRecords` defaults to `limit: 20`. Raise it well above that (e.g. 200-500) for any history query, and if the returned count equals your `limit`, narrow the date range and re-query so you're not silently missing activities.

## Current Form (Last 8-12 Weeks)

Call `querySportRecords` with a ~8-12 week `startDate`/`endDate` window, once with the running codes and once with the strength code.

From the running records, compute yourself:

- **Weekly volume**: group by ISO week, sum workout time (→ hours) and distance (→ km), count sessions
- **Longest recent run**: max distance/duration across the window
- **Average session duration/distance**

From the strength records:

- **Sessions per week**: count only — strength records don't carry meaningful distance, so track frequency and duration, not km
- **Consistency**: is strength training happening at all, or is the record set empty? An empty or sparse strength history is itself an important limiter signal (see `assessment.md`)

Then call `queryTrainingLoadAssessment` (with `days: 84` or so) for short-term load, long-term load, and load ratio — this is COROS's native equivalent of a weekly training-load trend for running, so prefer it over hand-computing one. Note it's HR/pace-driven and won't reflect strength-session fatigue — see `load-management.md`.

## Athletic Foundation (Lifetime / 2 Years)

Call `querySportRecords` for running with a multi-year `startDate` (raise `limit` accordingly; if the result looks truncated, split the range into smaller windows and combine). Do the same for strength to see whether the athlete has ever trained consistently, even if they aren't now.

From the full running record set, compute:

- **Lifetime peaks**: max distance/duration across all returned records
- **Peak training weeks ever**: group all records by week, sum duration, sort descending, take the top 5
- **Training history depth**: min/max activity date, total activity count, lifetime distance

**Race history**: COROS records don't carry a "race" flag the way some other platforms do. Scan activity `name`/`location` for anything that reads like a race (park run bib numbers, "marathon", "half," a location matching a known race course), or simply ask the athlete which sessions were races.

Also call `queryFitnessAssessmentOverview` — it returns VO2max, running level, threshold pace, and race predictions directly from COROS's own model, which is a strong standalone signal of athletic foundation.

## Strength / Limiter Detection

COROS doesn't expose a per-activity effort score, and its load assessment is running-focused. Use HR, load, and recovery for running, plus training frequency for strength:

- For key long or hard runs, call `getActivityDetail` or `analyzeActivityDetail` (with `focus: "heart rate"` or similar) on that activity's `labelId`/`sportType` to get avg/max HR, pace, and elevation.
- **Long runs at low HR relative to pace** = solid aerobic base.
- **High HR / high perceived effort for a given pace** = fitness limiter.
- Call `queryTrainingLoadAssessment` and `queryRecoveryStatus` together: rising load with lagging recovery is a sign the current running volume is outpacing recovery capacity.
- **Strength as a limiter**: if the strength `querySportRecords` query over the last 3-6 months returns few or no sessions, treat that as a limiter on its own, independent of running fitness — most runners who get hurt or plateau are under-strength-trained, not under-run-trained.
- **Dormant fitness**: compare the running record list's last-session date against its historical peak — a strong peak with no recent training is dormant fitness likely to return quickly.

## Schedule Preferences

From the `querySportRecords` results (each record includes a start timestamp), work out the day of week for:

- Long runs (>60 min)
- Strength sessions (any duration) — which days does the athlete currently lift, if at all?

Tally counts per weekday yourself from the returned list — there's no GROUP BY, so just walk the records.

## HR / Zone Data

- Call `queryAvgHeartRate` and `queryRestingHeartRate` over the last 8-12 weeks for daily HR trends.
- Call `queryFitnessAssessmentOverview` for COROS's own threshold pace and VO2max — prefer this over deriving zones purely from average activity HR, since it's a purpose-built assessment rather than an estimate.
- Call `queryDailyHealthData` (and `querySleepData`/`querySleepHrv`/`queryStressLevel` if more detail is useful) for sleep and stress context that feeds into load/readiness decisions in Phase 3.
