# Runnify Assistant

Runnify Assistant allows you to use Claude to create custom-tailored training programs for triathlons, marathons, and other endurance activities. Using a data-driven approach and principles from top training plans, Claude will create a training plan that's uniquely fit for you, your personal fitness, and the constraints you have in the next couple of weeks. Maybe you're recovering from an injury, maybe you're traveling and don't have access to a pool or track in a certain week - tell Claude about it and it'll create a plan that works for you.

The output is a beautiful training plan app that allows you to add, edit, or move workouts, mark them as complete, and update key training data like heart rate zones, LTHR, threshold paces, FTP, and others. Your data is kept locally in your browser.

Workouts can be exported as simple calendar events (.ics), Zwift (.zwo), Garmin (.fit), TrainerRoad/ERG (.mrc) workouts, or as a TrainingPeaks-compatible CSV for bulk-importing the whole plan.

## Examples

See example training plans at [alexandercalle.github.io/runnify-assistant](https://alexandercalle.github.io/runnify-assistant/#demos).

## Installation & Creating a training plan

I happen to work at Anthropic, so this tool is optimized for Claude. To use this tool, you need access to Claude.ai or Claude Code with network access for Skills. Depending on user/admin settings, Skills may have full, partial, or no network access.

Syncing all your Strava activities and creating a tailored training plan takes ca. 15 minutes.

### Installing the Skills

Runnify Assistant is two skills: **`coach`** creates the initial plan, and **`coach-checkin`** is what you come back to later for feedback and to adjust the plan as training actually happens. Install both — a plan you can never revisit stops matching reality within a couple of weeks.

Download the latest skills from GitHub Releases:

- [coach-skill.zip](https://github.com/AlexanderCalle/runnify-assistant/releases/latest/download/coach-skill.zip) — creates the plan
- [coach-checkin-skill.zip](https://github.com/AlexanderCalle/runnify-assistant/releases/latest/download/coach-checkin-skill.zip) — feedback and plan adaptation

**Claude.ai:**

1. Open [Claude.ai Settings](https://claude.ai/settings/capabilities)
2. Enable "Code execution and file creation"
3. In the allowed domains list, add `*.strava.com`
4. Scroll down to "Skills" and click "Add skill", then upload `coach-skill.zip`
5. Repeat step 4 for `coach-checkin-skill.zip`

**Claude Code:**

1. Run `/install-skill` and provide the path to `coach-skill.zip`.
2. Run `/install-skill` again and provide the path to `coach-checkin-skill.zip`.

### Creating a plan

Use the most capable model available to you (as I'm writing this, that's Opus 4.5). Prompt Claude with something like this:

> Help me create a training plan for the Ironman 70.3 Oceanside on March 29th 2026 using the "coach" skill.

Claude will ask how you'd like to provide your fitness data. You have two options: You can either tell Claude about your fitness history manually - or you can give it access to your Strava activities. I recommend the later - data doesn't lie and more data allows Claude to make a training plan that really fits you.

#### Option 1: Connect to Strava (Recommended)

The easiest way to get a personalized plan is to let Claude analyze your Strava training history. This gives Claude real data about your current fitness, training patterns, and progress.

Claude needs a `Client ID` and `Client Secret` to access your Strava activities. You're only giving Claude access to your data - nobody else gets to see it.

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) and log in with your Strava account
2. You'll see a form titled "My API Application" - fill it out:
   - **Application Name**: Enter anything you like (e.g., "Runnify Assistant")
   - **Category**: Select "Data Importer"
   - **Club**: Leave this blank
   - **Website**: Enter any URL (e.g., `https://claude.ai`)
   - **Application Description**: Enter anything (e.g., "Training plan generation")
   - **Authorization Callback Domain**: Enter `localhost`
3. Check the box to agree to Strava's API Agreement and click **Create**
4. Copy your **Client ID** and **Client Secret** and give them to Claude when prompted

#### Option 2: Manual Entry

Don't use Strava, or prefer not to connect it? No problem. You can tell Claude about your fitness directly. Be prepared to share:

**Current Training (recent 4-8 weeks):**

- Weekly training hours by sport (swim/bike/run)
- Typical long session distances (longest ride, longest run, etc.)
- Training consistency (how many weeks have you been training regularly?)

**Performance Benchmarks (any you know):**

- Bike FTP (Functional Threshold Power) in watts
- Run threshold pace or recent race times (5K, 10K, half marathon, etc.)
- Swim CSS (Critical Swim Speed) or recent time trial (e.g., 1000m time)
- Max heart rate and/or lactate threshold heart rate

### Telling Claude about your event & constraints

In the next step, Claude will ask you about yourself, the event you're training for, and any constraints it should keep in mind. Examples of information you'd tell any coach:

- Years in the sport
- Previous races completed (distances and approximate times)
- Any recent breaks from training
- Injuries or health issues
- Schedule limitations (work travel, family, etc.)
- Equipment access (pool availability, trainer, etc.)

Claude will use this information to create a plan tailored to your current fitness level. The more detail you provide, the better your plan will be.

### Checking In and Adapting the Plan

Once you're training against the plan, come back every week or two with the JSON plan file and ask Claude to check in (using the `coach-checkin` skill). Claude will:

- Compare what you actually did against what was planned (pulling from Strava/COROS again if connected, or asking you directly)
- Give you honest feedback on consistency, training load, and progress toward race day
- Adjust the upcoming weeks if you missed sessions, got sick or injured, traveled, or are ahead of schedule — and leave the plan alone if nothing needs to change

> Help me check in on my training plan (attached) - it's been two weeks since I last looked at it.

## Self-Hosting Your Plan (Optional)

By default the plan lives as a downloaded HTML file and/or a Claude Artifact — both fine, but both need a human to open the skill and re-publish before they reflect reality. If you'd rather have your plan live at a stable URL that a **scheduled, unattended check-in keeps up to date on its own**, run the plan server included in this repo (`src/server/plan-server.ts`) somewhere long-running — Dokploy, or any other Docker host.

### 1. Deploy the plan server

The repo root has a `Dockerfile` and `docker-compose.yml` set up for this.

**On Dokploy:**

1. Create a new application from this repository (Docker Compose type, using the root `docker-compose.yml`, or Dockerfile type pointing at the root `Dockerfile`).
2. Set the environment variable `PLAN_TOKEN` to a long random secret — e.g. `openssl rand -hex 32`. This one token gates both viewing the plan and publishing updates to it; don't skip it, since the deployed page is reachable at whatever domain Dokploy gives it.
3. Mount a persistent volume at `/app/data` (the compose file already declares one) — this is where the current plan and check-in history live; without it, a redeploy wipes the plan.
4. Deploy, and attach a domain in Dokploy the usual way.
5. Visit `https://your-domain/?token=<PLAN_TOKEN>` — you should see an empty-state plan page ("No plan published yet").

**Locally, for testing:** `cp .env.example .env`, fill in `PLAN_TOKEN`, then `npm run dev:server`.

### 2. Point the skills at it

Set two environment variables wherever `coach` / `coach-checkin` run (a Claude Code project's environment, a Cowork environment, or your own shell):

```
RUNNIFY_SERVER_URL=https://your-domain
RUNNIFY_SERVER_TOKEN=<the same PLAN_TOKEN>
```

With those set, both skills automatically publish to the server in addition to (not instead of) the Artifact/local-file output — see `npx runnify-assistant publish --help`. The next time you run `coach`, tell Claude your plan should also go to the hosted server; it'll pick up the env vars on its own.

### 3. Automate daily/weekly check-ins with a Cowork Routine

This is the piece that makes the page update itself: a scheduled Routine that fires `coach-checkin` in "headless" mode (see the "Running as a Scheduled Check-In" section in `skill-checkin/SKILL.md`) — it pulls yesterday's activities (Strava/COROS), compares them against the hosted plan, applies only the small, obviously-correct adjustments on its own, and pushes the result back to the server. Anything bigger (a race-goal change, a multi-week rebuild) gets left as a note for you to review, never applied unattended.

To set this up in Claude Code on the web / Cowork:

1. Make sure the environment the Routine fires into has `RUNNIFY_SERVER_URL`/`RUNNIFY_SERVER_TOKEN` set, and either a Strava refresh token or a connected COROS MCP — the check-in needs to pull activity data without you present.
2. Create a daily (or weekly) scheduled trigger whose prompt asks Claude to run a headless `coach-checkin` against the hosted plan and publish the result. Ask Claude to set this up for you and it can create the trigger directly.
3. Check the server occasionally (`GET /api/plan` returns the current plan plus a rolling history of check-in summaries) to see what's been happening without you.

### API reference

| Route            | Auth                                                    | Purpose                                                                    |
| ---------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `GET /`          | `?token=` query, `Authorization: Bearer`, or HTTP Basic | The plan viewer page, rendered with whatever was last published            |
| `GET /api/plan`  | same as above                                           | `{ plan, history }` — current plan JSON and the last 20 check-in summaries |
| `POST /api/plan` | `Authorization: Bearer`                                 | Publish a new plan: `{ plan, summary?, source? }`                          |
| `GET /health`    | none                                                    | Liveness check for Dokploy/Docker                                          |

# About

Runnify Assistant is an independent, open-source project and is not made by, endorsed by, or affiliated with Anthropic, PBC. "Claude" is a trademark of Anthropic. This tool is a skill/plugin that works with Claude products but is developed and maintained independently. License: MIT.
