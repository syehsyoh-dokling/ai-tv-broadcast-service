"use strict";
/**
 * routes/index.js — Semua endpoint AI TV API
 *
 * ── CHANNELS ──────────────────────────────────────────────
 *   GET    /channels                   Daftar semua channel
 *   GET    /channels/:id               Detail satu channel
 *   POST   /channels                   Buat channel baru
 *   PUT    /channels/:id               Update channel
 *   PATCH  /channels/:id/activate      Aktifkan/nonaktifkan channel
 *
 * ── ANCHORS ───────────────────────────────────────────────
 *   GET    /anchors                    Daftar semua anchor AI
 *   GET    /anchors/:id                Detail satu anchor
 *   POST   /anchors                    Buat anchor baru
 *   PUT    /anchors/:id                Update anchor
 *   PATCH  /anchors/:id/status         Ubah status (on-air/standby/off)
 *   PATCH  /anchors/:id/assign         Assign ke channel
 *
 * ── PROGRAMS ──────────────────────────────────────────────
 *   GET    /programs                   Daftar program (filter: channelId, status, date)
 *   GET    /programs/:id               Detail program
 *   POST   /programs                   Buat program baru
 *   PUT    /programs/:id               Update program
 *   DELETE /programs/:id               Hapus program
 *   PATCH  /programs/:id/status        Update status (live/completed/cancelled)
 *
 * ── SCRIPTS ───────────────────────────────────────────────
 *   GET    /scripts                    Daftar script (filter: anchorId, status, priority)
 *   GET    /scripts/next               Ambil script berikutnya dari queue
 *   GET    /scripts/:id                Detail script
 *   POST   /scripts                    Buat script manual
 *   POST   /scripts/generate           Generate script via AI
 *   POST   /scripts/generate/breaking  Generate breaking news
 *   POST   /scripts/generate/intro     Generate intro program
 *   POST   /scripts/generate/closing   Generate penutup program
 *   POST   /scripts/generate/transition Generate transisi antar anchor
 *   PUT    /scripts/:id                Update script
 *   PATCH  /scripts/:id/status         Ubah status (queued/on-air/done/skipped)
 *   DELETE /scripts/:id                Hapus script
 *
 * ── STREAMING ─────────────────────────────────────────────
 *   GET    /stream/platforms            Daftar platform + status
 *   GET    /stream/status               Status semua stream aktif
 *   POST   /stream/start                Start stream satu platform
 *   POST   /stream/start-all            Start semua platform sekaligus
 *   POST   /stream/stop                 Stop stream satu platform
 *   POST   /stream/stop-all             Stop semua stream
 *   GET    /stream/:platformId/health   Health check stream
 *   PUT    /stream/:platformId/config   Update konfigurasi stream
 *
 * ── BROADCAST ─────────────────────────────────────────────
 *   GET    /broadcast/state             State siaran global
 *   POST   /broadcast/go-live           Mulai siaran (set on-air)
 *   POST   /broadcast/end               Akhiri siaran
 *   PATCH  /broadcast/channel           Ganti channel aktif
 *   PATCH  /broadcast/anchor            Ganti anchor aktif
 *   PATCH  /broadcast/program           Set program aktif
 *   POST   /broadcast/emergency         Toggle emergency mode
 *
 * ── AUTOPILOT ─────────────────────────────────────────────
 *   GET    /autopilot/status            Status autopilot
 *   POST   /autopilot/start             Aktifkan AI autopilot
 *   POST   /autopilot/stop              Matikan autopilot
 *
 * ── GUESTS ────────────────────────────────────────────────
 *   GET    /guests                      Daftar narasumber
 *   POST   /guests                      Tambah narasumber
 *
 * ── CHAT ──────────────────────────────────────────────────
 *   GET    /chat                        Ambil pesan chat terbaru
 *   POST   /chat                        Kirim pesan chat
 *
 * ── STATS ─────────────────────────────────────────────────
 *   GET    /stats                       Statistik siaran lengkap
 *   GET    /stats/viewers               Grafik viewer realtime
 *
 * ── NOTIFICATIONS ─────────────────────────────────────────
 *   GET    /notifications               Daftar notifikasi
 *
 * ── SYSTEM ────────────────────────────────────────────────
 *   GET    /health                      Health check
 *   POST   /system/reset               Reset store ke seed (dev only)
 */

const express    = require("express");
const { v4: uuidv4 } = require("uuid");
const { ok, err, notFound, validate } = require("../middleware/helpers");

const store          = require("../store");
const aiService      = require("../services/aiService");
const streamService  = require("../services/streamService");
const autopilot      = require("../services/autopilotService");

const router = express.Router();

/* ════════════════════════════════════════════════════════════
   CHANNELS
════════════════════════════════════════════════════════════ */

router.get("/channels", (req, res) => {
  const filter = {};
  if (req.query.active !== undefined) filter.active = req.query.active === "true";
  if (req.query.category) filter.category = req.query.category;
  const channels = store.getChannels(filter);
  ok(res, { channels, total: channels.length });
});

router.get("/channels/:id", (req, res) => {
  const ch = store.getChannel(req.params.id);
  if (!ch) return notFound(res, "Channel");
  // Sertakan program yang sedang live
  const liveProgram = store.getPrograms({ channelId:ch.id, status:"live" })[0] || null;
  ok(res, { channel: { ...ch, liveProgram } });
});

router.post("/channels", validate({
  name:     { required:true, maxLength:80 },
  category: { required:true },
}), (req, res) => {
  const { name, number, category, color, emoji, description, defaultAnchorId } = req.body;
  const ch = store.createChannel({ name, number:number||"00", category, color:color||"#00d4ff", emoji:emoji||"📺", description:description||"", defaultAnchorId:defaultAnchorId||null, isActive:false });
  ok(res, { channel:ch }, 201);
});

router.put("/channels/:id", (req, res) => {
  const ch = store.getChannel(req.params.id);
  if (!ch) return notFound(res, "Channel");
  const allowed = ["name","number","category","color","emoji","description","defaultAnchorId"];
  const fields  = {};
  for (const k of allowed) if (req.body[k] !== undefined) fields[k] = req.body[k];
  const updated = store.updateChannel(ch.id, fields);
  ok(res, { channel:updated });
});

router.patch("/channels/:id/activate", (req, res) => {
  const ch = store.getChannel(req.params.id);
  if (!ch) return notFound(res, "Channel");
  const isActive = req.body.isActive ?? !ch.isActive;
  const updated  = store.updateChannel(ch.id, { isActive });
  store.addNotification({ type:"channel", level:"info", message:`Channel ${ch.name} ${isActive?"diaktifkan":"dinonaktifkan"}` });
  ok(res, { channel:updated, isActive });
});

/* ════════════════════════════════════════════════════════════
   ANCHORS
════════════════════════════════════════════════════════════ */

router.get("/anchors", (req, res) => {
  const filter = {};
  if (req.query.active   !== undefined) filter.active    = req.query.active === "true";
  if (req.query.status)                 filter.status    = req.query.status;
  if (req.query.channelId)              filter.channelId = req.query.channelId;
  const anchors = store.getAnchors(filter);
  ok(res, { anchors, total:anchors.length });
});

router.get("/anchors/:id", (req, res) => {
  const anchor = store.getAnchor(req.params.id);
  if (!anchor) return notFound(res, "Anchor");
  const recentScripts = store.getScripts({ anchorId:anchor.id, limit:5 });
  ok(res, { anchor: { ...anchor, recentScripts } });
});

router.post("/anchors", validate({
  name:        { required:true, maxLength:50 },
  role:        { required:true },
  personality: { required:true },
}), (req, res) => {
  const { name, fullName, role, specialty, aiModel, voiceId, gender, language, color, emoji, personality, scriptStyle } = req.body;
  const anchor = store.createAnchor({
    id:          name.toLowerCase().replace(/\s+/g,"_"),
    name:        name.toUpperCase(),
    fullName:    fullName || name,
    role, specialty:specialty||"Umum",
    aiModel:     aiModel || process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
    voiceId:     voiceId || `${name.toLowerCase()}-v1`,
    gender:      gender||"female", language:language||"id",
    color:       color||"#00d4ff", emoji:emoji||"🤖",
    personality, scriptStyle:scriptStyle||"formal",
    isActive:true, status:"standby", currentChannelId:null,
  });
  ok(res, { anchor }, 201);
});

router.put("/anchors/:id", (req, res) => {
  const anchor = store.getAnchor(req.params.id);
  if (!anchor) return notFound(res, "Anchor");
  const allowed = ["name","fullName","role","specialty","aiModel","voiceId","gender","language","color","emoji","personality","scriptStyle","isActive"];
  const fields  = {};
  for (const k of allowed) if (req.body[k] !== undefined) fields[k] = req.body[k];
  const updated = store.updateAnchor(anchor.id, fields);
  ok(res, { anchor:updated });
});

router.patch("/anchors/:id/status", validate({
  status: { required:true, enum:["on-air","standby","off"] },
}), (req, res) => {
  const anchor = store.getAnchor(req.params.id);
  if (!anchor) return notFound(res, "Anchor");
  const updated = store.updateAnchor(anchor.id, { status:req.body.status });
  ok(res, { anchor:updated });
});

router.patch("/anchors/:id/assign", (req, res) => {
  const anchor = store.getAnchor(req.params.id);
  if (!anchor) return notFound(res, "Anchor");
  const { channelId } = req.body;
  if (channelId) {
    const ch = store.getChannel(channelId);
    if (!ch) return notFound(res, "Channel");
  }
  const updated = store.updateAnchor(anchor.id, {
    currentChannelId: channelId || null,
    status: channelId ? "on-air" : "standby",
  });
  ok(res, { anchor:updated });
});

/* ════════════════════════════════════════════════════════════
   PROGRAMS
════════════════════════════════════════════════════════════ */

router.get("/programs", (req, res) => {
  const filter = {};
  if (req.query.channelId) filter.channelId = req.query.channelId;
  if (req.query.anchorId)  filter.anchorId  = req.query.anchorId;
  if (req.query.status)    filter.status    = req.query.status;
  if (req.query.date)      filter.date      = req.query.date;
  const programs = store.getPrograms(filter);
  ok(res, { programs, total:programs.length });
});

router.get("/programs/:id", (req, res) => {
  const prg = store.getProgram(req.params.id);
  if (!prg) return notFound(res, "Program");
  const channel = store.getChannel(prg.channelId);
  const anchor  = store.getAnchor(prg.anchorId);
  const scripts = prg.scriptIds?.length ? store.getScripts({ programId:prg.id }) : [];
  ok(res, { program: { ...prg, channel, anchor, scripts } });
});

router.post("/programs", validate({
  channelId:   { required:true },
  title:       { required:true, maxLength:120 },
  anchorId:    { required:true },
  startTime:   { required:true },
  endTime:     { required:true },
  durationMin: { required:true },
}), (req, res) => {
  const { channelId, title, anchorId, startTime, endTime, durationMin, category, description, date } = req.body;
  if (!store.getChannel(channelId)) return notFound(res, "Channel");
  if (!store.getAnchor(anchorId))   return notFound(res, "Anchor");
  const prg = store.createProgram({ channelId, title, anchorId, startTime, endTime, durationMin:parseInt(durationMin), category:category||"Umum", description:description||"", date:date||new Date().toISOString().slice(0,10), status:"scheduled", rating:0, aiGenerated:false });
  ok(res, { program:prg }, 201);
});

router.put("/programs/:id", (req, res) => {
  const prg = store.getProgram(req.params.id);
  if (!prg) return notFound(res, "Program");
  const allowed = ["title","anchorId","startTime","endTime","durationMin","category","description","date"];
  const fields  = {};
  for (const k of allowed) if (req.body[k] !== undefined) fields[k] = req.body[k];
  const updated = store.updateProgram(prg.id, fields);
  ok(res, { program:updated });
});

router.patch("/programs/:id/status", validate({
  status: { required:true, enum:["scheduled","live","completed","cancelled"] },
}), (req, res) => {
  const prg = store.getProgram(req.params.id);
  if (!prg) return notFound(res, "Program");
  const updated = store.updateProgram(prg.id, { status:req.body.status });
  if (req.body.status === "live") {
    store.updateBroadcastState({ activeProgramId:prg.id, activeAnchorId:prg.anchorId, activeChannelId:prg.channelId });
  }
  ok(res, { program:updated });
});

router.delete("/programs/:id", (req, res) => {
  const prg = store.getProgram(req.params.id);
  if (!prg) return notFound(res, "Program");
  if (prg.status === "live") return err(res, "Tidak bisa hapus program yang sedang live");
  store.deleteProgram(req.params.id);
  ok(res, { message:"Program dihapus", id:req.params.id });
});

/* ════════════════════════════════════════════════════════════
   SCRIPTS
════════════════════════════════════════════════════════════ */

router.get("/scripts", (req, res) => {
  const filter = {};
  if (req.query.anchorId)  filter.anchorId  = req.query.anchorId;
  if (req.query.programId) filter.programId = req.query.programId;
  if (req.query.channelId) filter.channelId = req.query.channelId;
  if (req.query.status)    filter.status    = req.query.status;
  if (req.query.priority)  filter.priority  = req.query.priority;
  if (req.query.limit)     filter.limit     = parseInt(req.query.limit);
  const scripts = store.getScripts(filter);
  ok(res, { scripts, total:scripts.length });
});

// Ambil script berikutnya dari antrian (dipanggil oleh UI setiap selesai membaca)
router.get("/scripts/next", (req, res) => {
  const { anchorId } = req.query;
  const script = store.getNextQueuedScript(anchorId || null);
  if (!script) return ok(res, { script:null, message:"Queue kosong" });
  ok(res, { script });
});

router.get("/scripts/:id", (req, res) => {
  const s = store.getScript(req.params.id);
  if (!s) return notFound(res, "Script");
  ok(res, { script:s });
});

// Buat script manual dari admin
router.post("/scripts", validate({
  anchorId: { required:true },
  text:     { required:true, maxLength:5000 },
}), (req, res) => {
  const { anchorId, channelId, programId, topic, text, priority, style } = req.body;
  if (!store.getAnchor(anchorId)) return notFound(res, "Anchor");
  const s = store.createScript({ anchorId, channelId, programId, topic:topic||"Manual", text, priority:priority||"medium", status:"queued", style:style||"formal", aiGenerated:false });
  ok(res, { script:s }, 201);
});

// Generate script via AI
router.post("/scripts/generate", validate({
  anchorId: { required:true },
  topic:    { required:true },
}), async (req, res) => {
  const { anchorId, topic, style, channelId, programId, maxChars, context, saveToQueue } = req.body;
  const anchor  = store.getAnchor(anchorId);
  if (!anchor) return notFound(res, "Anchor");
  const channel = channelId ? store.getChannel(channelId) : null;
  const program = programId ? store.getProgram(programId) : null;

  try {
    const text = await aiService.generateScript({
      anchorId, topic,
      style:        style || anchor.scriptStyle || "formal",
      channelName:  channel?.name,
      programTitle: program?.title,
      maxChars:     parseInt(maxChars) || 800,
      context,
    });

    let script = null;
    if (saveToQueue !== false) {
      script = store.createScript({ anchorId, channelId, programId, topic, text, priority:"medium", status:"queued", style:style||anchor.scriptStyle, aiGenerated:true });
    }
    ok(res, { script, text, charCount:text.length, aiGenerated:true }, 201);
  } catch (e) {
    err(res, `AI generate gagal: ${e.message}`, 500);
  }
});

// Generate breaking news
router.post("/scripts/generate/breaking", validate({
  headline: { required:true },
}), async (req, res) => {
  const { headline, details, anchorId, channelId } = req.body;
  const state  = store.getBroadcastState();
  const useId  = anchorId || state.activeAnchorId;
  const anchor = store.getAnchor(useId);
  if (!anchor) return notFound(res, "Anchor");

  try {
    const text   = await aiService.generateBreakingNews({ headline, details, anchorId:useId });
    const script = store.createScript({ anchorId:useId, channelId:channelId||state.activeChannelId, topic:headline, text, priority:"urgent", status:"queued", aiGenerated:true, style:"news", isBreaking:true });
    store.addNotification({ type:"breaking_news", level:"warning", message:`Breaking: ${headline}` });
    ok(res, { script, text }, 201);
  } catch (e) {
    err(res, `Generate breaking news gagal: ${e.message}`, 500);
  }
});

// Generate intro program
router.post("/scripts/generate/intro", async (req, res) => {
  const { anchorId, programTitle, channelName, topics, saveToQueue } = req.body;
  const anchor = store.getAnchor(anchorId);
  if (!anchor) return notFound(res, "Anchor");

  try {
    const text   = await aiService.generateIntro({ anchorId, programTitle, channelName, topics });
    let   script = null;
    if (saveToQueue !== false) {
      script = store.createScript({ anchorId, topic:`INTRO: ${programTitle}`, text, priority:"high", status:"queued", aiGenerated:true, style:"formal" });
    }
    ok(res, { script, text, charCount:text.length }, 201);
  } catch (e) {
    err(res, `Generate intro gagal: ${e.message}`, 500);
  }
});

// Generate closing program
router.post("/scripts/generate/closing", async (req, res) => {
  const { anchorId, programTitle, nextProgram, saveToQueue } = req.body;
  const anchor = store.getAnchor(anchorId);
  if (!anchor) return notFound(res, "Anchor");

  try {
    const text   = await aiService.generateClosing({ anchorId, programTitle, nextProgram });
    let   script = null;
    if (saveToQueue !== false) {
      script = store.createScript({ anchorId, topic:`CLOSING: ${programTitle}`, text, priority:"medium", status:"queued", aiGenerated:true, style:"formal" });
    }
    ok(res, { script, text, charCount:text.length }, 201);
  } catch (e) {
    err(res, `Generate closing gagal: ${e.message}`, 500);
  }
});

// Generate transisi antar anchor
router.post("/scripts/generate/transition", validate({
  fromAnchorId: { required:true },
  toAnchorId:   { required:true },
  nextTopic:    { required:true },
}), async (req, res) => {
  const { fromAnchorId, toAnchorId, nextTopic, saveToQueue } = req.body;
  const anchors = store.getAnchors();

  try {
    const text   = await aiService.generateTransition({ fromAnchorId, toAnchorId, nextTopic, anchors });
    let   script = null;
    if (saveToQueue !== false) {
      script = store.createScript({ anchorId:fromAnchorId, topic:`TRANSISI → ${toAnchorId}`, text, priority:"high", status:"queued", aiGenerated:true, style:"formal" });
    }
    ok(res, { script, text }, 201);
  } catch (e) {
    err(res, `Generate transisi gagal: ${e.message}`, 500);
  }
});

// Summarize berita dari artikel
router.post("/scripts/generate/summary", validate({
  articles: { required:true },
}), async (req, res) => {
  const { articles, anchorId, maxPoints } = req.body;
  if (!Array.isArray(articles)) return err(res, "articles harus berupa array");
  const anchor = store.getAnchor(anchorId || store.getBroadcastState().activeAnchorId);

  try {
    const text = await aiService.summarizeNews({ articles, anchorId:anchor?.id||"nova", maxPoints });
    ok(res, { text, charCount:text.length });
  } catch (e) {
    err(res, `Summarize gagal: ${e.message}`, 500);
  }
});

// Update script
router.put("/scripts/:id", (req, res) => {
  const s = store.getScript(req.params.id);
  if (!s) return notFound(res, "Script");
  const allowed = ["text","topic","priority","style"];
  const fields  = {};
  for (const k of allowed) if (req.body[k] !== undefined) fields[k] = req.body[k];
  const updated = store.updateScript(s.id, fields);
  ok(res, { script:updated });
});

// Update status script
router.patch("/scripts/:id/status", validate({
  status: { required:true, enum:["queued","on-air","done","skipped"] },
}), (req, res) => {
  const s = store.getScript(req.params.id);
  if (!s) return notFound(res, "Script");
  const fields = { status:req.body.status };
  if (req.body.status === "on-air") {
    fields.startedAt = new Date().toISOString();
    fields.readCount = (s.readCount||0) + 1;
    store.updateBroadcastState({ currentScript: s.id });
    // Update anchor stats
    const anchor = store.getAnchor(s.anchorId);
    if (anchor) store.updateAnchor(anchor.id, { stats:{ ...anchor.stats, totalScripts:(anchor.stats?.totalScripts||0)+1 } });
  }
  if (req.body.status === "done" || req.body.status === "skipped") {
    fields.endedAt = new Date().toISOString();
    store.updateBroadcastState({ currentScript:null });
  }
  const updated = store.updateScript(s.id, fields);
  ok(res, { script:updated });
});

router.delete("/scripts/:id", (req, res) => {
  const s = store.getScript(req.params.id);
  if (!s) return notFound(res, "Script");
  if (s.status === "on-air") return err(res, "Tidak bisa hapus script yang sedang on-air");
  store.deleteScript(req.params.id);
  ok(res, { message:"Script dihapus", id:req.params.id });
});

/* ════════════════════════════════════════════════════════════
   STREAMING
════════════════════════════════════════════════════════════ */

router.get("/stream/platforms", (_req, res) => {
  ok(res, { platforms: streamService.getPlatformList() });
});

router.get("/stream/status", (_req, res) => {
  const streams = streamService.getAllStreamStatus();
  const live    = streams.filter(s => s.status === "live");
  ok(res, {
    streams,
    summary: {
      totalLive:    live.length,
      totalViewers: live.reduce((a,s) => a+(s.viewers||0), 0),
      platforms:    live.map(s => s.platformId),
    },
  });
});

router.post("/stream/start", validate({
  platformId: { required:true, enum:["youtube","tiktok","facebook","instagram","custom"] },
}), async (req, res) => {
  const { platformId, resolution, streamKey, rtmpUrl, channelId } = req.body;
  try {
    const stream = await streamService.startStream({ platformId, resolution, streamKey, rtmpUrl, channelId });
    ok(res, { stream, message:`Stream ${platformId} dimulai` }, 201);
  } catch (e) {
    err(res, e.message, e.message.includes("sudah aktif") ? 409 : 500);
  }
});

router.post("/stream/start-all", async (req, res) => {
  const { resolution, channelId, platforms } = req.body;
  try {
    const results = await streamService.startAllStreams({ resolution, channelId, platforms });
    ok(res, { results, message:`${results.started.length} stream dimulai, ${results.failed.length} gagal` });
  } catch (e) {
    err(res, e.message, 500);
  }
});

router.post("/stream/stop", validate({
  platformId: { required:true },
}), async (req, res) => {
  try {
    const stream = await streamService.stopStream(req.body.platformId);
    ok(res, { stream, message:`Stream ${req.body.platformId} dihentikan` });
  } catch (e) {
    err(res, e.message, e.message.includes("tidak ditemukan") ? 404 : 500);
  }
});

router.post("/stream/stop-all", async (_req, res) => {
  const results = await streamService.stopAllStreams();
  ok(res, { results, message:`${results.stopped.length} stream dihentikan` });
});

router.get("/stream/:platformId/health", (req, res) => {
  const stream = streamService.refreshStreamHealth(req.params.platformId);
  if (!stream) return err(res, `Stream ${req.params.platformId} tidak aktif`, 404);
  ok(res, { health: stream.health, viewers: stream.viewers, platformId: req.params.platformId });
});

router.put("/stream/:platformId/config", (req, res) => {
  try {
    const result = streamService.updateStreamConfig(req.params.platformId, req.body);
    ok(res, { ...result, message:"Konfigurasi stream diperbarui" });
  } catch (e) {
    err(res, e.message);
  }
});

/* ════════════════════════════════════════════════════════════
   BROADCAST STATE
════════════════════════════════════════════════════════════ */

router.get("/broadcast/state", (_req, res) => {
  const state    = store.getBroadcastState();
  const channel  = state.activeChannelId ? store.getChannel(state.activeChannelId)  : null;
  const anchor   = state.activeAnchorId  ? store.getAnchor(state.activeAnchorId)    : null;
  const program  = state.activeProgramId ? store.getProgram(state.activeProgramId)  : null;
  const streams  = streamService.getAllStreamStatus().filter(s => s.status==="live");
  const queueLen = store.getScripts({ status:"queued" }).length;
  ok(res, {
    state: {
      ...state,
      uptime: state.startedAt ? Math.floor((Date.now()-new Date(state.startedAt).getTime())/1000) : 0,
    },
    activeChannel: channel,
    activeAnchor:  anchor,
    activeProgram: program,
    liveStreams:   streams.length,
    scriptQueue:   queueLen,
    autopilot:     autopilot.status(),
  });
});

router.post("/broadcast/go-live", async (req, res) => {
  const { channelId, anchorId, programId, autoStream } = req.body;
  const ch  = channelId ? store.getChannel(channelId)  : store.getChannels({ active:true })[0];
  const anc = anchorId  ? store.getAnchor(anchorId)    : store.getAnchors({ status:"standby" })[0];
  if (!ch)  return err(res, "Tidak ada channel yang tersedia");
  if (!anc) return err(res, "Tidak ada anchor yang tersedia");

  store.updateBroadcastState({
    isOnAir:        true,
    activeChannelId: ch.id,
    activeAnchorId:  anc.id,
    activeProgramId: programId || null,
    startedAt:       new Date().toISOString(),
  });
  store.updateAnchor(anc.id, { status:"on-air", currentChannelId:ch.id });

  // Auto-start streams jika diminta
  let streamResults = null;
  if (autoStream) {
    streamResults = await streamService.startAllStreams({});
  }

  // Generate intro script
  const introText = await aiService.generateIntro({ anchorId:anc.id, programTitle:"Siaran Langsung AI TV", channelName:ch.name }).catch(()=>null);
  if (introText) {
    store.createScript({ anchorId:anc.id, channelId:ch.id, topic:"INTRO SIARAN", text:introText, priority:"urgent", status:"queued", aiGenerated:true });
  }

  store.addNotification({ type:"broadcast", level:"success", message:`ON AIR: ${ch.name} dengan anchor ${anc.name}` });
  ok(res, { message:"Siaran dimulai", channel:ch, anchor:anc, streamResults });
});

router.post("/broadcast/end", async (_req, res) => {
  const state = store.getBroadcastState();
  store.updateBroadcastState({ isOnAir:false });

  // Stop semua stream
  await streamService.stopAllStreams();
  // Stop autopilot
  autopilot.stop();

  // Set anchor kembali standby
  if (state.activeAnchorId) {
    store.updateAnchor(state.activeAnchorId, { status:"standby", currentChannelId:null });
  }

  store.addNotification({ type:"broadcast", level:"info", message:"Siaran berakhir" });
  ok(res, { message:"Siaran dihentikan", endedAt:new Date().toISOString() });
});

router.patch("/broadcast/channel", validate({ channelId:{required:true} }), (req, res) => {
  const ch = store.getChannel(req.body.channelId);
  if (!ch) return notFound(res, "Channel");
  store.updateBroadcastState({ activeChannelId:ch.id });
  store.addNotification({ type:"broadcast", level:"info", message:`Pindah channel: ${ch.name}` });
  ok(res, { activeChannel:ch });
});

router.patch("/broadcast/anchor", validate({ anchorId:{required:true} }), (req, res) => {
  const anchor = store.getAnchor(req.body.anchorId);
  if (!anchor) return notFound(res, "Anchor");
  const prev = store.getBroadcastState().activeAnchorId;
  if (prev && prev !== anchor.id) {
    store.updateAnchor(prev, { status:"standby" });
  }
  store.updateAnchor(anchor.id, { status:"on-air" });
  store.updateBroadcastState({ activeAnchorId:anchor.id });
  store.addNotification({ type:"broadcast", level:"info", message:`Anchor aktif: ${anchor.name}` });
  ok(res, { activeAnchor:anchor });
});

router.patch("/broadcast/program", validate({ programId:{required:true} }), (req, res) => {
  const prg = store.getProgram(req.body.programId);
  if (!prg) return notFound(res, "Program");
  store.updateBroadcastState({ activeProgramId:prg.id, activeAnchorId:prg.anchorId, activeChannelId:prg.channelId });
  store.updateProgram(prg.id, { status:"live" });
  ok(res, { activeProgram:prg });
});

router.post("/broadcast/emergency", (req, res) => {
  const state = store.getBroadcastState();
  const mode  = req.body.enable ?? !state.emergencyMode;
  store.updateBroadcastState({ emergencyMode:mode });
  store.addNotification({ type:"emergency", level:mode?"error":"info", message:mode?"🚨 EMERGENCY MODE AKTIF":"Emergency mode dinonaktifkan" });
  ok(res, { emergencyMode:mode });
});

/* ════════════════════════════════════════════════════════════
   AUTOPILOT
════════════════════════════════════════════════════════════ */

router.get("/autopilot/status", (_req, res) => {
  ok(res, { autopilot: autopilot.status() });
});

router.post("/autopilot/start", (_req, res) => {
  const result = autopilot.start();
  ok(res, { autopilot:result, message:result.message || "Autopilot diaktifkan" });
});

router.post("/autopilot/stop", (_req, res) => {
  const result = autopilot.stop();
  ok(res, { autopilot:result, message:result.message || "Autopilot dimatikan" });
});

/* ════════════════════════════════════════════════════════════
   CHAT (Live Viewer Chat)
════════════════════════════════════════════════════════════ */

router.get("/chat", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const chats = store.getChats(limit);
  ok(res, { messages:chats, total:chats.length });
});

router.post("/chat", validate({
  username: { required:true, maxLength:40 },
  message:  { required:true, maxLength:500 },
}), (req, res) => {
  const { username, message, channelId, userId } = req.body;
  const chat = store.addChat({ username, message, channelId:channelId||null, userId:userId||null });
  ok(res, { message:chat }, 201);
});

/* ════════════════════════════════════════════════════════════
   STATISTICS
════════════════════════════════════════════════════════════ */

router.get("/stats", (_req, res) => {
  const state    = store.getBroadcastState();
  const channels = store.getChannels();
  const anchors  = store.getAnchors();
  const programs = store.getPrograms();
  const scripts  = store.getScripts({ limit:1000 });
  const streams  = streamService.getAllStreamStatus();
  const liveSt   = streams.filter(s => s.status==="live");

  ok(res, {
    stats: {
      broadcast: {
        isOnAir:      state.isOnAir,
        totalViewers: state.viewerTotal || 0,
        uptime:       state.startedAt ? Math.floor((Date.now()-new Date(state.startedAt).getTime())/1000) : 0,
        aiAutopilot:  state.aiAutopilot,
        emergencyMode:state.emergencyMode,
      },
      channels: {
        total:  channels.length,
        active: channels.filter(c=>c.isActive).length,
        categories: [...new Set(channels.map(c=>c.category))],
      },
      anchors: {
        total:   anchors.length,
        onAir:   anchors.filter(a=>a.status==="on-air").length,
        standby: anchors.filter(a=>a.status==="standby").length,
        off:     anchors.filter(a=>a.status==="off").length,
      },
      programs: {
        total:     programs.length,
        live:      programs.filter(p=>p.status==="live").length,
        scheduled: programs.filter(p=>p.status==="scheduled").length,
        completed: programs.filter(p=>p.status==="completed").length,
      },
      scripts: {
        total:      scripts.length,
        queued:     scripts.filter(s=>s.status==="queued").length,
        onAir:      scripts.filter(s=>s.status==="on-air").length,
        done:       scripts.filter(s=>s.status==="done").length,
        aiGenerated:scripts.filter(s=>s.aiGenerated).length,
        breaking:   scripts.filter(s=>s.isBreaking).length,
      },
      streaming: {
        livePlatforms:  liveSt.length,
        platforms:      liveSt.map(s=>s.platformId),
        totalViewers:   liveSt.reduce((a,s)=>a+(s.viewers||0),0),
      },
      chat: {
        totalMessages: store.getChats(1000).length,
      },
    },
  });
});

router.get("/stats/viewers", (_req, res) => {
  const state   = store.getBroadcastState();
  const streams = streamService.getAllStreamStatus().filter(s=>s.status==="live");
  // Simulasi time-series 10 menit terakhir
  const now     = Date.now();
  const series  = Array.from({length:10}).map((_,i) => ({
    timestamp: new Date(now - (9-i)*60000).toISOString(),
    viewers:   Math.max(100, (state.viewerTotal||1000) + Math.floor(Math.random()*500-250)),
  }));
  ok(res, {
    current:    state.viewerTotal || 0,
    series,
    byPlatform: streams.map(s => ({ platformId:s.platformId, viewers:s.viewers||0 })),
  });
});

/* ════════════════════════════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════════════════════════════ */

router.get("/notifications", (req, res) => {
  const unreadOnly = req.query.unread === "true";
  const notifs = store.getNotifications(unreadOnly);
  ok(res, { notifications:notifs, total:notifs.length });
});

/* ════════════════════════════════════════════════════════════
   SYSTEM
════════════════════════════════════════════════════════════ */

router.get("/health", (_req, res) => {
  const state = store.getBroadcastState();
  ok(res, {
    status:    "ok",
    timestamp: new Date().toISOString(),
    isOnAir:   state.isOnAir,
    autopilot: autopilot.status().running,
    version:   "1.0.0",
    node:      process.version,
  });
});

router.post("/system/reset", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return err(res, "Reset tidak diizinkan di production", 403);
  }
  autopilot.stop();
  store.reset();
  ok(res, { message:"Store direset ke seed data" });
});

/* ════════════════════════════════════════════════════════════
   PODCASTER EXTENSIONS (Guests & Realtime SSE)
════════════════════════════════════════════════════════════ */

router.get("/guests", (req, res) => {
  ok(res, { guests: store.getGuests(req.query), total: store.getGuests(req.query).length });
});

router.post("/guests", validate({
  name: { required:true, maxLength:80 },
}), (req, res) => {
  const g = store.createGuest(req.body);
  ok(res, { guest: g }, 201);
});

router.get("/stream/realtime", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Format: "event: [type]\ndata: [json]\n\n"
  const sendEvent = () => {
    const data = {
      viewers: 1247 + Math.floor(Math.random() * 100),
      wave: Array.from({ length: 8 }, () => Math.floor(Math.random() * 30) + 10)
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send immediately, then every 2 seconds
  sendEvent();
  const intervalId = setInterval(sendEvent, 2000);

  req.on("close", () => {
    clearInterval(intervalId);
  });
});

module.exports = router;
