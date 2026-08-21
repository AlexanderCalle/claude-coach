# Training Load Management

Professional coaches quantify training stress to manage fatigue, prevent overtraining, and peak for races.

**COROS-native shortcut:** `queryTrainingLoadAssessment` returns short-term load, long-term load, and a load ratio directly — the concepts below (TSS/CTL/ATL/TSB) map onto that output (see "Running TSS" below) and are most useful for reasoning about targets and phase structure, not for re-deriving numbers COROS already gives you.

## Running Training Stress Score (rTSS)

Estimated from pace and HR. Prefer COROS's own `queryTrainingLoadAssessment` over hand-computing this where possible:

- Short-term load ≈ ATL, long-term load ≈ CTL, and the load ratio behaves like a TSB-style balance signal (rising ratio = fatigue building, falling/low ratio = fresher)
- When you need a per-session comparison, use avg HR relative to LTHR-based zones (see `zones.md`) as the proxy for relative intensity, and compare that across sessions of similar duration

### rTSS Guidelines by Workout Type

| Workout                | Typical rTSS | Recovery Needed |
| ------------------------ | ------------- | ------------------ |
| Easy 30-45min run       | 30-45         | Same day OK        |
| Long run (90min-2hr)    | 90-140        | 24-48 hours         |
| Tempo/threshold session | 70-100        | 24-48 hours         |
| VO2max intervals        | 80-110        | 48-72 hours         |
| Marathon-distance race  | 250-350       | 1-2 weeks           |

### Strength Training Load — Not TSS-Compatible

Strength sessions don't map cleanly onto TSS/rTSS; there's no established power/pace-driven formula for a lifting session, and COROS's `queryTrainingLoadAssessment` is HR/pace-driven, so it will under-represent or miss the fatigue from a heavy strength day entirely.

- Use **session RPE × duration** (sRPE) as a rough load proxy instead: RPE (1-10, see `zones.md`) × minutes = an arbitrary-unit load you can compare session-to-session, even though it's not directly comparable to rTSS numbers.
- Treat a heavy lower-body strength session as real fatigue toward the next day's running, even if COROS's load numbers don't reflect it — don't schedule a quality run the day immediately after a heavy squat/deadlift-style session.
- When reading `queryRecoveryStatus`, remember it's also endurance-focused: cross-check it against how the athlete actually reports feeling after strength days, especially early in a new strength habit when soreness runs high.

**Hypertrophy volume specifically**: upper-body work has much lower *direct* interference with running mechanics than lower-body strength (see `workouts.md`), so it's tempting to add it freely. It still isn't free, though — every added set draws on the same shared pools of sleep, nutrition, and systemic recovery capacity that running is also drawing on. Count sRPE from hypertrophy sessions in the athlete's total weekly load, and if recovery signals (RHR, HRV, subjective scores below) start trending worse after hypertrophy volume increases, trim the hypertrophy work before touching running — running is the plan's primary goal.

---

## Chronic Training Load (CTL) - "Fitness"

CTL is the rolling 42-day weighted average of daily TSS. It represents accumulated running fitness.

### CTL Ramp Rate Guidelines

| Athlete Level | Max CTL Increase/Week | Notes                            |
| -------------- | ------------------------- | ------------------------------------ |
| Beginner       | 3-5 TSS/day                | Conservative to prevent injury      |
| Intermediate   | 5-7 TSS/day                | Standard progression                 |
| Advanced       | 7-10 TSS/day               | Aggressive; requires monitoring     |

_A CTL ramp of 7/week means adding ~50 TSS/week to your average weekly load._

---

## Acute Training Load (ATL) - "Fatigue"

ATL is the rolling 7-day weighted average of daily TSS. It represents recent fatigue.

---

## Training Stress Balance (TSB) - "Form"

```
TSB = CTL - ATL
```

| TSB Range  | State        | Implication                                |
| ----------- | ------------- | ---------------------------------------------- |
| +15 to +25 | Fresh/peaked | Race ready, may lose fitness if maintained     |
| +5 to +15  | Rested       | Good for quality sessions, minor events        |
| -10 to +5  | Neutral      | Normal training state                          |
| -10 to -30 | Fatigued     | Building load, need recovery soon              |
| < -30      | Overreaching | High injury/burnout risk, reduce load          |

### Race Day TSB Targets

| Event         | Target TSB | Taper Length |
| -------------- | ----------- | -------------- |
| 5K/10K          | 0 to +10    | 5-7 days       |
| Half Marathon  | +5 to +15   | 7-10 days      |
| Marathon        | +10 to +20  | 14-21 days     |
| Ultra (50K+)    | +15 to +25  | 14-21 days     |

---

## Weekly rTSS Targets by Phase

| Phase          | % of Peak rTSS | Focus                                    |
| --------------- | ---------------- | ------------------------------------------- |
| Base (early)    | 60-70%           | Building volume                            |
| Base (late)     | 75-85%           | Volume + introducing intensity             |
| Build           | 90-100%          | Peak volume, race-specific work            |
| Peak            | 85-95%           | Maintaining fitness, sharpening            |
| Taper           | 40-60%           | Reducing volume, maintaining intensity     |
| Recovery week   | 50-60%           | Every 3-4 weeks                            |

---

## Recovery Monitoring

### Heart Rate-Based Indicators

**Resting Heart Rate (RHR):**

- Measure every morning before getting up
- RHR elevated 5-10+ bpm = accumulated fatigue
- Sustained elevation over 3+ days = consider recovery day/week
- Sudden drop below baseline = potential illness onset

**Heart Rate Variability (HRV):**

- Higher HRV = better recovered
- Lower HRV = stressed/fatigued
- HRV 10%+ below baseline = reduce intensity
- Track 7-day rolling average, not daily swings

### Subjective Indicators (1-5 scale)

| Metric          | Questions                        |
| ---------------- | ----------------------------------- |
| Sleep quality    | How restful? Wake during night?     |
| Energy           | How do you feel getting up?         |
| Muscle soreness  | General, or localized to a recent strength session? |
| Mood             | Motivated or dreading training?     |
| Appetite         | Normal, elevated, or suppressed?    |

**Warning patterns:**

- 2+ low scores for 3+ days = back off
- Sleep + mood both low = high burnout risk
- Muscle soreness that doesn't fade within 48-72 hours after a strength session = the load progressed too fast; drop back to Foundation intensity next time (see `zones.md`)

### Recovery Week Structure

Every 3-4 weeks:

| Day | Prescription                                       |
| --- | ------------------------------------------------------ |
| 1   | Complete rest or 30min Zone 1                          |
| 2   | 45-60min Zone 2 run                                    |
| 3   | Light strength or mobility work, or rest               |
| 4   | Complete rest                                          |
| 5   | 45-60min Zone 2 with 3-4 short accelerations           |
| 6   | Light run, re-assess readiness                         |
| 7   | If feeling good, ease back into normal training        |

**Volume reduction:** 40-50% of normal week
**Intensity reduction:** No Zone 4+ running; strength drops to maintenance load only
