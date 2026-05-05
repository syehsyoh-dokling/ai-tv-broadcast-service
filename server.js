"use strict";
require("dotenv").config();

const express = require("express");
const cors    = require("cors");
const { logger } = require("./src/middleware/helpers");

const routes    = require("./src/routes/index");
const autopilot = require("./src/services/autopilotService");

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit:"5mb" }));
app.use(express.urlencoded({ extended:true }));
app.use(logger);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", routes);

// Root — endpoint index
app.get("/", (_req, res) => {
  res.json({
    name:    "🎬 AI TV API",
    version: "1.0.0",
    baseUrl: `http://localhost:${PORT}/api`,
    endpoints: {
      "── CHANNELS ──":        "",
      "GET  /channels":        "Daftar channel",
      "GET  /channels/:id":    "Detail channel",
      "POST /channels":        "Buat channel baru",
      "PUT  /channels/:id":    "Update channel",
      "── ANCHORS ──":         "",
      "GET  /anchors":         "Daftar anchor AI",
      "GET  /anchors/:id":     "Detail anchor",
      "POST /anchors":         "Buat anchor baru",
      "PUT  /anchors/:id":     "Update anchor",
      "PATCH /anchors/:id/status":  "Ubah status anchor",
      "PATCH /anchors/:id/assign":  "Assign ke channel",
      "── PROGRAMS ──":        "",
      "GET  /programs":        "Jadwal program (filter: channelId, status)",
      "GET  /programs/:id":    "Detail program",
      "POST /programs":        "Buat program",
      "PUT  /programs/:id":    "Update program",
      "PATCH /programs/:id/status": "Update status program",
      "DELETE /programs/:id":  "Hapus program",
      "── SCRIPTS ──":         "",
      "GET  /scripts":              "Daftar script (filter: anchorId, status, priority)",
      "GET  /scripts/next":         "Script berikutnya dari queue",
      "POST /scripts":              "Buat script manual",
      "POST /scripts/generate":     "Generate via AI",
      "POST /scripts/generate/breaking":    "Generate breaking news",
      "POST /scripts/generate/intro":       "Generate intro program",
      "POST /scripts/generate/closing":     "Generate penutup",
      "POST /scripts/generate/transition":  "Generate transisi anchor",
      "POST /scripts/generate/summary":     "Summarize artikel berita",
      "PATCH /scripts/:id/status":          "Update status script",
      "── STREAMING ──":       "",
      "GET  /stream/platforms": "Daftar platform streaming",
      "GET  /stream/status":    "Status semua stream",
      "POST /stream/start":     "Start stream satu platform",
      "POST /stream/start-all": "Start semua platform",
      "POST /stream/stop":      "Stop stream",
      "POST /stream/stop-all":  "Stop semua stream",
      "GET  /stream/:id/health":"Health check stream",
      "PUT  /stream/:id/config":"Update konfigurasi stream",
      "── BROADCAST ──":       "",
      "GET  /broadcast/state":      "State siaran global",
      "POST /broadcast/go-live":    "Mulai siaran",
      "POST /broadcast/end":        "Akhiri siaran",
      "PATCH /broadcast/channel":   "Ganti channel aktif",
      "PATCH /broadcast/anchor":    "Ganti anchor aktif",
      "PATCH /broadcast/program":   "Set program aktif",
      "POST /broadcast/emergency":  "Toggle emergency mode",
      "── AUTOPILOT ──":       "",
      "GET  /autopilot/status": "Status autopilot",
      "POST /autopilot/start":  "Aktifkan AI autopilot",
      "POST /autopilot/stop":   "Matikan autopilot",
      "── MISC ──":             "",
      "GET  /chat":            "Live chat viewer",
      "POST /chat":            "Kirim pesan chat",
      "GET  /stats":           "Statistik lengkap",
      "GET  /stats/viewers":   "Grafik viewer realtime",
      "GET  /notifications":   "Notifikasi sistem",
      "GET  /health":          "Health check",
    },
  });
});

// 404
app.use((_req, res) => res.status(404).json({ success:false, error:"Endpoint tidak ditemukan" }));

// Global error handler
app.use((e, _req, res, _next) => {
  console.error("Unhandled:", e.message);
  res.status(500).json({ success:false, error:"Internal server error" });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
const store = require("./src/store");
const state = store.getBroadcastState();

console.log("\n🎬 AI TV API");
console.log("─".repeat(44));
console.log(`📍 Port     : ${PORT}`);
console.log(`🗄  Store    : ./data/tv_store.json`);
console.log(`📺 Channels : ${store.getChannels().length} (${store.getChannels({active:true}).length} aktif)`);
console.log(`🤖 Anchors  : ${store.getAnchors().length} (${store.getAnchors({active:true}).length} aktif)`);
console.log(`📋 Programs : ${store.getPrograms().length}`);
console.log(`🔴 On Air   : ${state.isOnAir ? "YA" : "TIDAK"}`);
console.log(`🤖 Autopilot: ${state.aiAutopilot ? "ON" : "OFF"}`);
console.log(`🔑 AI Key   : ${process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant-xxx") ? "⚠️  DEMO MODE" : "✅ Configured"}`);

// Auto-start autopilot jika siaran aktif
if (state.isOnAir && state.aiAutopilot) {
  setTimeout(() => {
    autopilot.start();
    console.log("🤖 Autopilot auto-started");
  }, 2000);
}

app.listen(PORT, () => {
  console.log(`\n✅ Server: http://localhost:${PORT}`);
  console.log(`📖 Docs  : http://localhost:${PORT}/\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => { autopilot.stop(); process.exit(0); });
process.on("SIGINT",  () => { autopilot.stop(); process.exit(0); });

module.exports = app;
