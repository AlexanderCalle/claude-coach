# When and How to Adapt the Plan

A check-in should change the plan when the evidence crosses one of the triggers below — not on a schedule, and not just because a check-in is happening. Each trigger below has a typical response; treat these as starting points to reason from, not fixed formulas. Always propose the change and get confirmation before writing it (see `SKILL.md` Step 5), except where noted.

## Missed Sessions

| Situation                                                               | Response                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One or two easy runs missed, no pattern                                 | No change. Note it, move on.                                                                                                                                                                                                                                                                                                    |
| A full week missed (illness, travel, life)                              | Don't try to "make up" the missed volume. Repeat the week's intent (same phase, similar target hours) rather than jumping straight to the next week's higher load — treat the return as a short re-entry, not a resumption exactly where the plan left off.                                                                     |
| 2+ consecutive weeks missed                                             | Insert a re-ramp: 1-2 weeks at reduced volume (roughly where they were 2-3 weeks before the gap) before rejoining the plan's progression. Recalculate whether the remaining weeks to race day still allow adequate build + taper; if not, have the ambition conversation (see "Race Readiness Gap" below) rather than cramming. |
| Consistent partial completion (e.g., always cutting the long run short) | This is a signal, not noise — ask why before adjusting. Could be pacing/fueling (see `coach`'s `race-day.md`), could be the prescribed volume is still too high for this athlete's current capacity. Adjust the prescription to match demonstrated capacity rather than repeating a target they keep not hitting.               |
| Strength consistently skipped while running holds                       | Don't silently let it go. Ask what's in the way (time, access, motivation) and problem-solve: shorter sessions, different days, or — if the honest answer is "it's not happening" — reduce to a minimum-effective-dose (1x/week, shorter) rather than leaving an unmet 2-3x/week target in the plan the athlete keeps failing.  |

## Injury or Pain

- Any new pain, especially anything matching the athlete's known limiters from the original assessment (IT band, plantar fasciitis, shin splints, runner's knee, Achilles), gets taken seriously immediately — don't wait for it to "become a pattern."
- Ask: when does it happen (during, after, next morning), where exactly, how it's trending (better/same/worse day to day), any swelling.
- **Mild and not worsening**: reduce volume/intensity on the affected movement pattern for the coming week, keep everything else, monitor at the next check-in.
- **Worsening, or pain during activity that changes gait/form**: pull the affected activity (running and/or the loaded strength movement) for the coming week, sub in cross-training or rest, and tell the athlete plainly to get it assessed by a physio/doctor if it doesn't clear in a few days. **Never diagnose. You are a coach, not a clinician** — your job is to reduce load and point them to the right professional, not to name the injury or promise a timeline.
- Log the injury and the response in the relevant week's `notes` so future check-ins have the history.

## Illness

- Standard guidance: no structured training with fever or symptoms below the neck (chest, GI); light activity is usually fine with only above-the-neck symptoms (mild cold), athlete's call.
- Reduce or skip the sick days/week entirely rather than trying to preserve volume around it.
- Coming back: treat like a short missed block (see above) — resume at reduced load for a few days even if they feel recovered, since fitness lags how you feel by a day or two.

## Travel / Life Disruption

- If the athlete flags an upcoming disruption (not just a past one), adapt proactively rather than waiting for it to already show up as missed sessions: swap in equipment-free strength alternatives, shift the long run to whatever day works, or plan a lower-volume week in advance.
- One disrupted week inside a longer plan is normal and doesn't need heavy adjustment — just move sessions around inside the week rather than compressing them or dropping them all.

## Overreaching Signals

Watch for the combination, not any single data point in isolation: rising training load (`queryTrainingLoadAssessment`) + lagging recovery (`queryRecoveryStatus`) + subjective reports of flat/tired/unmotivated + elevated resting HR or declining HRV if available.

- **One or two signals**: worth a mention in feedback, no plan change yet — flag it and watch the next check-in.
- **Multiple signals together, especially with the athlete confirming they feel run down**: pull back — an extra easy day, drop or shorten the next quality session, or move up a recovery week if one is coming soon anyway. This is exactly the failure mode strength+running plans are supposed to prevent by managing load; don't let enthusiasm (from either the athlete or you) override it.

## Ahead of Schedule

- Completing everything with room to spare, low RPE on sessions that should feel moderately hard, or COROS fitness metrics (VO2max, threshold pace) improving faster than expected.
- Don't just pile on more volume — that's how overreaching starts. Small, deliberate increases: a bit more volume, slightly earlier introduction of the next phase's intensity, or — if this is happening early and consistently — a conversation about whether a more ambitious race goal makes sense.
- Confirm with the athlete before raising the goal itself; confirm before large volume jumps even if they're "ahead."

## Race Readiness Gap

If missed time, injury, or a slow build means the remaining weeks can't realistically deliver both an adequate build phase and a proper taper for the original goal:

- Say so directly, with the reasoning (weeks remaining, what's achievable in that time per `coach`'s `periodization.md` progression guidance).
- Offer the realistic options: adjust the goal (slower target time, or a supported-finish rather than a time goal), or — if the event allows it — consider deferring to a later race.
- This is an "ask, don't decide for them" moment. The athlete may have reasons (a non-negotiable race date, a personal goal) to proceed anyway with eyes open; your job is to make sure they're choosing that knowingly.

## Race Date / Goal Changes

- If the athlete tells you the race changed (different date, different event, cancelled), this is close to a re-plan rather than an adaptation — rebuild `phases`, `weeks` going forward, and `raceStrategy` around the new date/event, but preserve the assessment and everything already completed. If the change is large enough (different distance entirely, many months' difference), it's reasonable to suggest starting fresh with the `coach` skill instead.
