# COROS MCP Data for Athlete Assessment

Pull athlete data using the `Coros_MCP` tools below. Unlike a database, these tools return raw records, not aggregates — you group, sum, and average them yourself as you read through the results. Dates for these tools are `yyyyMMdd`.

**Pagination note:** `querySportRecords` defaults to `limit: 20`. Raise it well above that (e.g. 200-500) for any history query, and if the returned count equals your `limit`, narrow the date range and re-query so you're not silently missing activities.

## Current Form (Last 8-12 Weeks)

For each sport, call `querySportRecords` with a ~8-12 week `startDate`/`endDate` window and the matching `sportTypeCodes`:

- Run: `[100, 101, 102, 103]`
- Bike: `[200, 201, 202, 203, 204, 205, 299]`
- Swim: `[300, 301]`

From the returned activity list, compute yourself:

- **Weekly volume by sport**: group records by ISO week, sum workout time (→ hours) and distance (→ km), count sessions
- **Longest recent sessions**: max distance/duration per sport across the window
- **Average session duration**: mean workout time and distance per sport

Then call `queryTrainingLoadAssessment` (with `days: 84` or so) for short-term load, long-term load, and load ratio — this is COROS's native equivalent of a weekly training-load trend, so prefer it over hand-computing one. See `load-management.md` for how to read it.

## Athletic Foundation (Lifetime / 2 Years)

Call `querySportRecords` per sport with a multi-year `startDate` (raise `limit` accordingly; if the result looks truncated, split the range into smaller windows and combine).

From the full record set, compute:

- **Lifetime peaks by sport**: max distance/duration per sport across all returned records
- **Peak training weeks ever**: group all records by week, sum duration, sort descending, take the top 5
- **Training history depth**: min/max activity date per sport, total activity count, lifetime distance

**Race history**: COROS records don't carry a "race" flag the way some other platforms do. Scan activity `name`/`location` for anything that reads like a race, or simply ask the athlete which sessions were races.

Also call `queryFitnessAssessmentOverview` — it returns VO2max, running level, threshold pace, and race predictions directly from COROS's own model, which is a strong standalone signal of athletic foundation.

## Strength / Limiter Detection

COROS doesn't expose a per-activity effort score. Use HR, load, and recovery instead:

- For key long or hard sessions, call `getActivityDetail` or `analyzeActivityDetail` (with `focus: "heart rate"` or similar) on that activity's `labelId`/`sportType` to get avg/max HR, pace, and elevation.
- **Long sessions at low HR relative to pace/effort** = aerobic strength in that sport.
- **High HR / high perceived effort for a given duration** = limiter in that sport.
- Call `queryTrainingLoadAssessment` and `queryRecoveryStatus` together: a sport that consistently drives load up while recovery lags is a limiter; a sport the athlete handles with fast recovery return is a strength.
- **Dormant fitness**: from the full sport-records list, compare each sport's last-session date against its historical peak — a sport with a strong peak but no recent sessions is dormant fitness likely to return quickly.

## Schedule Preferences

From the `querySportRecords` results (each record includes a start timestamp), work out the day of week for:

- Long rides (>90 min)
- Long runs (>60 min)
- Swim sessions

Tally counts per weekday yourself from the returned list — there's no GROUP BY, so just walk the records.

## HR / Zone Data

- Call `queryAvgHeartRate` and `queryRestingHeartRate` over the last 8-12 weeks for daily HR trends.
- Call `queryFitnessAssessmentOverview` for COROS's own threshold pace and VO2max — prefer this over deriving zones purely from average activity HR, since it's a purpose-built assessment rather than an estimate.
- Call `queryDailyHealthData` (and `querySleepData`/`querySleepHrv`/`queryStressLevel` if more detail is useful) for sleep and stress context that feeds into load/readiness decisions in Phase 3.
