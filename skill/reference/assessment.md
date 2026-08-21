# Athlete Assessment Guide

## Foundation vs Current Form

These are two different things:

| Dimension               | Timeframe           | What It Tells You                                                 |
| ----------------------- | ------------------- | ----------------------------------------------------------------- |
| **Athletic Foundation** | Lifetime / 2+ years | What the athlete is capable of; training history; race experience |
| **Current Form**        | Last 8-12 weeks     | Where they are RIGHT NOW; starting point for the plan             |

**Why this matters**: An athlete who ran a marathon last year but has barely trained in 10 weeks is NOT the same as a beginner. They have:

- Muscle memory and running economy
- Mental toughness and race experience
- Knowledge of pacing, nutrition, taper strategy
- A body that has adapted to high training loads before

Their plan should focus on **rebuilding** (faster progression possible) rather than **building from scratch** (conservative progression required).

## Interpreting Foundation vs Form

| Scenario                                | Foundation  | Current Form | Plan Approach                                                |
| ---------------------------------------- | ----------- | ------------- | -------------------------------------------------------------- |
| Marathon finisher, 10 weeks off          | Very strong | Low           | Rebuild: faster progression OK, body remembers                |
| First-time runner                        | None        | Low-Moderate  | Build: conservative progression, everything is new             |
| Consistent runner, never strength trains | Moderate    | Strong (run)  | Add strength as a new limiter; build it in gradually alongside running |
| Consistent runner + lifter, no races     | Moderate    | Strong        | Peak: maintain and sharpen, add race specificity               |

## Interpreting Strength Signals

| Signal                                          | Interpretation                                  |
| ------------------------------------------------ | -------------------------------------------------- |
| Long runs at low HR                             | Excellent aerobic base                             |
| High HR relative to pace for a given duration    | Running fitness is a current limiter                |
| Load stays high, recovery lags after hard runs   | Running volume/intensity is outpacing recovery       |
| Historical running peaks >> recent activity      | Dormant running fitness, will return quickly         |
| Little or no strength-training history           | Strength is a limiter independent of running fitness |
| Consistent strength sessions, but light loads only | Foundation is there; ready to progress load          |

**Limiter identification**: Pull avg/max HR per run via `getActivityDetail`/`analyzeActivityDetail` and compare relative effort (HR for a given pace or duration) across recent sessions, alongside `queryTrainingLoadAssessment`/`queryRecoveryStatus`. Separately, check strength-session frequency over the last 3-6 months — a runner with strong run fitness but no strength history has a real limiter that just doesn't show up in running metrics.

## Example Interpretation

_"The athlete's runs show 10km at avg HR 150 with recovery status back to baseline the next morning — that's a strong aerobic base. But their COROS history shows zero strength sessions in the last year, and they've mentioned recurring IT band tightness on longer runs. Running fitness is not the limiter here; the missing strength work is. The plan should maintain current running volume while building in 2x/week strength focused on hips, glutes, and single-leg stability — the pieces most likely to be protecting against that IT band irritation."_

## Event Requirements Reference

| Event         | Distance |
| -------------- | -------- |
| 5K              | 5km      |
| 10K             | 10km     |
| Half Marathon  | 21.1km   |
| Marathon        | 42.2km   |
| Ultra (50K)     | 50km     |
| Ultra (100K+)   | 100km+   |

**Gap analysis**: Compare their longest recent/historical run against the target distance to gauge how much long-run progression the plan needs.

---

## Validating With The Athlete

**IMPORTANT**: Before creating the training plan, always share your assessment and validate it with the athlete.

### What to Ask

1. **Race history / athletic foundation**: _"I see you completed a marathon in [year] and have [X] years of running history. Does that match your background?"_

2. **Reason for time off**: _"You've had lower training volume recently. Was this due to injury, life circumstances, or something else?"_ (Injury = more conservative; life = faster rebuild OK)

3. **Strengths assessment**: _"Based on your data, your aerobic base looks strong—you're holding low HR on long runs. Does that match how you feel out there?"_

4. **Limiter identification**: _"I don't see any strength training in your history. Would you say that's accurate, and is it something you're open to adding?"_

5. **Dormant fitness**: _"I see you haven't run consistently in 4 months but had strong fitness earlier this year. Do you expect that to come back quickly?"_

6. **Constraints**: _"Any injuries, schedule constraints, upcoming travel, or equipment limitations I should know about?"_ (Gym access, home equipment, bodyweight-only)

7. **Goals**: _"Do you have a time goal, or is finishing the main focus?"_

8. **Preferences**: _"Are there workouts you love or hate? Do you enjoy lifting, or would you rather keep strength sessions short and simple?"_

9. **Long run and strength scheduling**: _"Which days work best for your long run and strength sessions? I see from your data you typically do long runs on [day]."_ (Check their historical patterns first—look for runs >60min and any strength sessions to infer preferred days)

### Inferring Long Run and Strength Scheduling

Before asking, analyze their COROS data to identify patterns:

- Call `querySportRecords` with `sportTypeCodes: [100, 101, 102, 103]` (run) and `minDurationMinutes: 60` over the last several months.
- Call `querySportRecords` with `sportTypeCodes: [402]` (strength) over the same window.
- For each result set, read the day of week off each record's start timestamp and tally counts yourself — there's no GROUP BY, so just walk the list.

Use this data to make an informed suggestion: _"I notice you typically do your long runs on Sunday. Should we anchor strength sessions on Monday and Thursday, so they don't collide with your long run or a hard midweek session?"_

### Example Dialogue

```
Based on your COROS data, here's my initial assessment:

**Strengths:**
- Aerobic base: Your long runs sit at HR 150-155 and recovery bounces back
  by the next morning. That's a solid foundation to build from.

**Limiters:**
- Strength training: I don't see any strength sessions in your COROS history,
  and you've mentioned some IT band tightness on longer runs. That's a common
  pattern when hip/glute strength hasn't kept up with running volume.

**My recommendation:** Keep your running volume where it is for the first
few weeks while we add 2x/week strength focused on hips, glutes, and
single-leg stability. Once that's a habit, we'll build both together.

Before I create the plan:
1. Does this assessment match how you feel?
2. Any injuries or constraints I should know about?
3. Do you have gym access, or should sessions be bodyweight/home-equipment based?
4. Do you have a time goal, or is finishing the focus?
```

### Why Validation Matters

- Data can mislead: Low recent volume ≠ lack of ability
- Athletes know their bodies: Prior injuries, what causes burnout, what they enjoy
- Buy-in matters: Athletes follow plans they helped shape
- Context changes everything: A "weak" run might be due to recovering from injury, not lack of fitness

**Never finalize a plan without athlete confirmation of the assessment.**
