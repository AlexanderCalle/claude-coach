/**
 * Hosted plan server.
 *
 * A small, dependency-free HTTP server meant to run continuously (e.g. on
 * Dokploy) so a training plan lives at a stable URL instead of only inside a
 * chat session. It serves the same `templates/plan-viewer.html` app the CLI's
 * `render` command produces, but injects whatever plan was most recently
 * published instead of baking one in at build time - so `coach` / `coach-checkin`
 * (interactively, or from a scheduled Routine) can update the live page with
 * `npx runnify-assistant publish` and nobody has to rebuild or redeploy.
 *
 * Auth: a single shared secret (PLAN_TOKEN) gates both reading and writing.
 * Read access via `Authorization: Bearer`, HTTP Basic (any username, token as
 * password), or a `?token=` query param (so the plan URL itself can be shared
 * as a link: `https://your-domain/?token=...`). Write access (POST /api/plan)
 * requires the same token as a Bearer header.
 */
import { createHash, timingSafeEqual } from "crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { log } from "../lib/logging.js";
import { loadTemplate, injectPlanData } from "../lib/render-plan.js";
import { readHistory, readPlan, writePlan } from "./store.js";

const PORT = Number(process.env.PORT) || 3000;
const PLAN_TOKEN = process.env.PLAN_TOKEN;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2MB - generous for a training plan JSON doc

if (!PLAN_TOKEN) {
  log.error(
    "PLAN_TOKEN is not set. Refusing to start unauthenticated - set PLAN_TOKEN to a long random secret."
  );
  process.exit(1);
}

function tokenMatches(candidate: string | null): boolean {
  if (!candidate) return false;
  // Compare fixed-length digests rather than the raw strings so neither the
  // length nor the content of a wrong guess is observable via timing.
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256")
    .update(PLAN_TOKEN as string)
    .digest();
  return timingSafeEqual(a, b);
}

function extractToken(req: IncomingMessage, url: URL): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice("Basic ".length), "base64").toString("utf-8");
    const idx = decoded.indexOf(":");
    return idx === -1 ? decoded : decoded.slice(idx + 1);
  }
  return url.searchParams.get("token");
}

function isAuthed(req: IncomingMessage, url: URL): boolean {
  return tokenMatches(extractToken(req, url));
}

function sendUnauthorized(res: ServerResponse): void {
  res.writeHead(401, {
    "content-type": "text/plain",
    "www-authenticate": 'Basic realm="plan"',
  });
  res.end("Unauthorized");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

const EMPTY_STATE_BODY = JSON.stringify({
  meta: { id: "empty", event: "No plan published yet", athlete: "" },
  phases: [],
  weeks: [],
});

async function handlePlanPage(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  if (!isAuthed(req, url)) return sendUnauthorized(res);

  const planJson = readPlan() ?? EMPTY_STATE_BODY;
  const html = injectPlanData(loadTemplate(), planJson);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

async function handleGetApiPlan(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<void> {
  if (!isAuthed(req, url)) return sendUnauthorized(res);

  const planJson = readPlan();
  sendJson(res, 200, {
    plan: planJson ? JSON.parse(planJson) : null,
    history: readHistory(20),
  });
}

async function handlePostApiPlan(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
): Promise<void> {
  if (!isAuthed(req, url)) return sendUnauthorized(res);

  let body: string;
  try {
    body = await readBody(req);
  } catch (err) {
    return sendJson(res, 413, { error: (err as Error).message });
  }

  let parsed: { plan?: unknown; summary?: string; source?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    return sendJson(res, 400, { error: "Request body must be JSON" });
  }

  if (!parsed.plan || typeof parsed.plan !== "object") {
    return sendJson(res, 400, { error: "Missing required `plan` object in request body" });
  }

  const planJson = JSON.stringify(parsed.plan, null, 2);
  writePlan(planJson, { source: parsed.source, summary: parsed.summary });

  log.success(`Plan updated${parsed.source ? ` (source: ${parsed.source})` : ""}`);
  sendJson(res, 200, { ok: true, updatedAt: new Date().toISOString() });
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  const handler = (async () => {
    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }
    if (url.pathname === "/" && req.method === "GET") {
      return handlePlanPage(req, res, url);
    }
    if (url.pathname === "/api/plan" && req.method === "GET") {
      return handleGetApiPlan(req, res, url);
    }
    if (url.pathname === "/api/plan" && req.method === "POST") {
      return handlePostApiPlan(req, res, url);
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  })();

  handler.catch((err) => {
    log.error(`Request handler error: ${(err as Error).message}`);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "text/plain" });
    }
    res.end("Internal server error");
  });
});

server.listen(PORT, () => {
  log.ready(`Plan server listening on :${PORT}`);
});
