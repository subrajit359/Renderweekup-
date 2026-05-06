import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─── Scheduler ───────────────────────────────────────────────────────────────

const INTERVAL_MS = 1 * 60 * 1000; // 1 minutes
const MAX_HISTORY = 20;
const MAX_BODY_LENGTH = 300;

const targets = [
  {
    id: "default",
    url: process.env.TARGET_URL || "https://crt-4-1.onrender.com/api/health",
    method: "GET",
    body: null,
  },
];

const historyMap = { default: [] };
const statsMap = { default: { total: 0, success: 0, failure: 0 } };

function addTarget(url, method, body = null) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  targets.push({ id, url, method, body });
  historyMap[id] = [];
  statsMap[id] = { total: 0, success: 0, failure: 0 };
  return targets.find((t) => t.id === id);
}

function removeTarget(id) {
  const idx = targets.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  targets.splice(idx, 1);
  delete historyMap[id];
  delete statsMap[id];
  return true;
}

async function pingTarget(target) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const stats = statsMap[target.id];
  if (!stats) return;
  stats.total++;

  const opts = { method: target.method };
  if (target.method === "POST" && target.body) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = target.body;
  }

  try {
    const response = await fetch(target.url, opts);
    const elapsedMs = Date.now() - start;
    let responseBody = null;
    try {
      const text = await response.text();
      responseBody = text.length > MAX_BODY_LENGTH ? text.slice(0, MAX_BODY_LENGTH) + "…" : text;
    } catch {}

    const record = { timestamp, status: response.status, elapsedMs, success: response.ok, error: null, responseBody };
    response.ok ? stats.success++ : stats.failure++;
    historyMap[target.id].push(record);
    if (historyMap[target.id].length > MAX_HISTORY) historyMap[target.id].shift();
    console.log(`[${timestamp}] ${target.method} ${target.url} → ${response.status} (${elapsedMs}ms)`);
  } catch (err) {
    const elapsedMs = Date.now() - start;
    const record = { timestamp, status: null, elapsedMs, success: false, error: err.message, responseBody: null };
    stats.failure++;
    historyMap[target.id].push(record);
    if (historyMap[target.id].length > MAX_HISTORY) historyMap[target.id].shift();
    console.error(`[${timestamp}] ${target.method} ${target.url} FAILED: ${err.message}`);
  }
}

async function pingAll() {
  await Promise.allSettled(targets.map((t) => pingTarget(t)));
}

function startScheduler() {
  console.log(`Scheduler started — pinging every 2 minutes.`);
  pingAll();
  setInterval(pingAll, INTERVAL_MS);
}

// ─── API ─────────────────────────────────────────────────────────────────────

app.get("/api/ping-history", (_req, res) => {
  res.json({
    intervalMs: INTERVAL_MS,
    targets: targets.map((t) => ({
      target: t,
      records: [...(historyMap[t.id] ?? [])].reverse(),
      totalPings: statsMap[t.id]?.total ?? 0,
      successCount: statsMap[t.id]?.success ?? 0,
      failureCount: statsMap[t.id]?.failure ?? 0,
    })),
  });
});

app.get("/api/targets", (_req, res) => res.json({ targets }));

app.post("/api/targets", (req, res) => {
  const { url, method, body } = req.body;
  if (!url || !["GET", "POST"].includes(method)) {
    return res.status(400).json({ error: "url and method (GET|POST) required" });
  }
  const target = addTarget(url, method, body ?? null);
  res.status(201).json(target);
});

app.delete("/api/targets/:id", (req, res) => {
  const ok = removeTarget(req.params.id);
  ok ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
});

app.get("/api/ping-now", async (_req, res) => {
  await pingAll();
  res.json({ ok: true });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Renderweekup running on port ${PORT}`);
  startScheduler();
});
