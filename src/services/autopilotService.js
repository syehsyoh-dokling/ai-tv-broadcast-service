"use strict";
/**
 * autopilotService.js — Mesin otomasi siaran TV AI
 *
 * Saat autopilot ON, sistem secara otomatis:
 *  1. Generate & queue script baru setiap N detik
 *  2. Rotate anchor sesuai jadwal program
 *  3. Inject breaking news jika ada
 *  4. Update viewer counts
 *  5. Monitor stream health
 */

const store     = require("../store");
const aiService = require("./aiService");
const { v4: uuidv4 } = require("uuid");

const INTERVAL_MS = parseInt(process.env.SCRIPT_INTERVAL_MS) || 15000;

let _timer        = null;
let _isRunning    = false;
let _tickCount    = 0;

// Topik pool per kategori channel
const TOPIC_POOL = {
  "Berita":     ["Perkembangan geopolitik Asia Tenggara","Update kebijakan pemerintah terbaru","Laporan ekonomi kuartal ini","Bencana alam & upaya penanggulangan","Diplomasi internasional terkini"],
  "Teknologi":  ["Perkembangan model AI generasi terbaru","Startup teknologi Indonesia yang naik daun","Regulasi AI global yang akan datang","Chip semikonduktor & perang teknologi","Robotik dan otomasi industri 2025"],
  "Keuangan":   ["Pergerakan IHSG hari ini","Analisis crypto market mingguan","Saham sektor energi terbarukan","Kebijakan suku bunga Bank Indonesia","Investasi reksadana era AI"],
  "Gaya Hidup": ["Tren fashion AI-generated 2025","Kuliner fusion yang sedang viral","Destinasi wisata hidden gem","Kesehatan mental di era digital","Produktivitas dengan AI tools"],
  "Hiburan":    ["Film & serial AI-generated terpopuler","Musik yang dibuat oleh AI","Konser virtual & metaverse entertainment","Kreator konten AI terbaik minggu ini","Industri gaming & e-sport Asia"],
  "Olahraga":   ["Analisis pertandingan sepak bola terkini","Statistik performa pemain nasional","E-sport championship Asia 2025","Atlet AI-coached berprestasi dunia","Liga basket nasional update"],
  "Edukasi":    ["Metode belajar dengan AI tutor","Skill paling dicari di era AI","Universitas yang integrasi AI penuh","Beasiswa teknologi untuk generasi muda","Platform edukasi online terpopuler"],
  "Sains":      ["Penemuan ilmiah terbaru NASA","Riset AI untuk kesehatan manusia","Energi terbarukan dan masa depan bumi","Eksplorasi laut dalam & biodiversitas","Fisika kuantum untuk orang awam"],
};

// ── Start autopilot ────────────────────────────────────────────────────────────
function start() {
  if (_isRunning) return { running: true, message: "Autopilot sudah aktif" };

  _isRunning = true;
  _timer     = setInterval(_tick, INTERVAL_MS);
  _tick();   // langsung jalankan tick pertama

  store.updateBroadcastState({ aiAutopilot: true });
  store.addNotification({ type:"autopilot", level:"info", message:"AI Autopilot diaktifkan" });

  console.log(`🤖 Autopilot started (interval: ${INTERVAL_MS}ms)`);
  return { running: true, intervalMs: INTERVAL_MS };
}

// ── Stop autopilot ─────────────────────────────────────────────────────────────
function stop() {
  if (!_isRunning) return { running: false, message: "Autopilot sudah mati" };

  clearInterval(_timer);
  _timer     = null;
  _isRunning = false;

  store.updateBroadcastState({ aiAutopilot: false });
  store.addNotification({ type:"autopilot", level:"info", message:"AI Autopilot dinonaktifkan" });

  console.log("🛑 Autopilot stopped");
  return { running: false };
}

function status() {
  return {
    running:     _isRunning,
    tickCount:   _tickCount,
    intervalMs:  INTERVAL_MS,
    nextTickIn:  _isRunning ? INTERVAL_MS : null,
  };
}

// ── Main tick ─────────────────────────────────────────────────────────────────
async function _tick() {
  _tickCount++;
  const state = store.getBroadcastState();
  if (!state.isOnAir) return;

  try {
    // Setiap tick: update viewer count
    _updateViewers();

    // Setiap 2 tick: generate script baru jika queue kosong/sedikit
    if (_tickCount % 2 === 0) {
      await _generateNextScript(state);
    }

    // Setiap 8 tick (~2 menit): cek rotasi program
    if (_tickCount % 8 === 0) {
      _checkProgramRotation();
    }

    // Setiap 20 tick (~5 menit): random breaking news
    if (_tickCount % 20 === 0 && Math.random() > 0.7) {
      await _injectBreakingNews(state);
    }

  } catch (e) {
    console.error("Autopilot tick error:", e.message);
  }
}

// ── Generate script otomatis ───────────────────────────────────────────────────
async function _generateNextScript(state) {
  const queued = store.getScripts({ status:"queued", limit:5 });
  if (queued.length >= 3) return; // queue cukup penuh

  const anchor  = store.getAnchor(state.activeAnchorId);
  const channel = store.getChannel(state.activeChannelId);
  const program = state.activeProgramId ? store.getProgram(state.activeProgramId) : null;
  if (!anchor || !channel) return;

  const topics   = TOPIC_POOL[channel.category] || TOPIC_POOL["Berita"];
  const topic    = topics[Math.floor(Math.random() * topics.length)];

  try {
    const text = await aiService.generateScript({
      anchorId:     anchor.id,
      topic,
      style:        anchor.scriptStyle || "formal",
      channelName:  channel.name,
      programTitle: program?.title || "Siaran Langsung",
      maxChars:     parseInt(process.env.SCRIPT_CHUNK_CHARS) || 800,
    });

    store.createScript({
      anchorId:    anchor.id,
      channelId:   channel.id,
      programId:   program?.id || null,
      topic,
      text,
      priority:    "medium",
      status:      "queued",
      aiGenerated: true,
      style:       anchor.scriptStyle,
    });

    console.log(`📝 Auto-script generated: [${anchor.name}] "${topic.slice(0,40)}..."`);
  } catch (e) {
    console.warn("Auto-script gagal:", e.message);
  }
}

// ── Update viewer counts ───────────────────────────────────────────────────────
function _updateViewers() {
  const state   = store.getBroadcastState();
  const delta   = Math.floor(Math.random() * 120 - 40);
  const total   = Math.max(1000, (state.viewerTotal || 0) + delta);
  store.updateBroadcastState({ viewerTotal: total });

  // Update channel viewer count
  const ch = store.getChannel(state.activeChannelId);
  if (ch) store.updateChannel(ch.id, { viewers: total });
}

// ── Cek rotasi program (sederhana) ────────────────────────────────────────────
function _checkProgramRotation() {
  const now   = new Date();
  const hhmm  = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  const state = store.getBroadcastState();

  // Cari program yang seharusnya sedang live sekarang
  const programs = store.getPrograms({ channelId: state.activeChannelId });
  const current  = programs.find(p => p.startTime <= hhmm && p.endTime > hhmm);

  if (current && current.id !== state.activeProgramId) {
    store.updateBroadcastState({
      activeProgramId: current.id,
      activeAnchorId:  current.anchorId,
    });
    store.updateProgram(current.id, { status:"live" });

    // Update status program lama
    if (state.activeProgramId) {
      store.updateProgram(state.activeProgramId, { status:"completed" });
    }

    store.addNotification({
      type:    "program_change",
      level:   "info",
      message: `Program berganti: "${current.title}" dipandu ${current.anchorId.toUpperCase()}`,
    });
    console.log(`📺 Program rotation: ${current.title} | Anchor: ${current.anchorId}`);
  }
}

// ── Inject breaking news ──────────────────────────────────────────────────────
async function _injectBreakingNews(state) {
  const BREAKING_HEADLINES = [
    "Indeks AI Global cetak rekor tertinggi sepanjang sejarah",
    "Pemerintah Indonesia rilis regulasi AI nasional terbaru",
    "Startup AI lokal berhasil raih pendanaan triliunan rupiah",
    "Peneliti temukan terobosan baru dalam model bahasa AI",
    "Kebijakan suku bunga global pengaruhi pasar Asia",
    "Forum AI internasional sepakati standar keamanan baru",
  ];

  const headline = BREAKING_HEADLINES[Math.floor(Math.random() * BREAKING_HEADLINES.length)];
  const anchor   = store.getAnchor(state.activeAnchorId);
  if (!anchor) return;

  try {
    const text = await aiService.generateBreakingNews({
      headline,
      anchorId: anchor.id,
    });

    store.createScript({
      anchorId:    anchor.id,
      channelId:   state.activeChannelId,
      topic:       headline,
      text,
      priority:    "urgent",
      status:      "queued",
      aiGenerated: true,
      style:       "news",
      isBreaking:  true,
    });

    store.addNotification({
      type:    "breaking_news",
      level:   "warning",
      message: `Breaking News: ${headline}`,
    });

    console.log(`🔴 Breaking News injected: ${headline}`);
  } catch (e) {
    console.warn("Breaking news injection gagal:", e.message);
  }
}

module.exports = { start, stop, status };
