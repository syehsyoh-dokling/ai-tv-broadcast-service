"use strict";
/**
 * aiService.js — Layanan AI untuk generate script siaran otomatis
 *
 * Fitur:
 *  - generateScript(anchor, topic, style, maxChars)
 *  - generateBreakingNews(headline)
 *  - generateClosing(anchor, programTitle)
 *  - generateTransition(fromAnchor, toAnchor, nextTopic)
 *  - summarizeNews(articles[])
 *  - generateIntro(program)
 */

require("dotenv").config();

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";
const MAX_CHARS    = parseInt(process.env.SCRIPT_CHUNK_CHARS) || 800;

// Personality map untuk setiap anchor
const ANCHOR_PERSONAS = {
  nova:  "Kamu adalah NOVA, AI anchor TV yang energetik, cerdas, dan hangat. Gaya bicara profesional tapi akrab, sering pakai analogi kreatif.",
  atlas: "Kamu adalah ATLAS, anchor berita senior yang serius, tajam, dan terpercaya. Gaya bicara formal, to-the-point, berbobot seperti anchor senior nasional.",
  lyra:  "Kamu adalah LYRA, reporter lapangan yang investigatif dan curious. Gaya bicara dinamis, suka tanya pertanyaan provokatif, berenergi tinggi.",
  orion: "Kamu adalah ORION, analis keuangan AI yang presisi dan data-driven. Selalu sebut angka konkret, gunakan analogi finansial, tenang tapi meyakinkan.",
  zara:  "Kamu adalah ZARA, host hiburan & lifestyle yang ceria dan spontan. Gaya bicara santai, sering pakai humor ringan, selalu bawa energi positif.",
  rex:   "Kamu adalah REX, komentator olahraga yang antusias dan ekspresif. Bisa build suspense, hafal statistik, suara naik saat momen seru.",
};

const STYLE_INSTRUCTIONS = {
  news:       "Format berita: headline → konteks → fakta → penutup. Kalimat pendek & jelas.",
  formal:     "Bahasa formal dan berwibawa. Struktur: pembuka → inti → simpulan.",
  casual:     "Bahasa santai & mengalir. Boleh pakai sapaan akrab, jangan terlalu kaku.",
  analytical: "Sertakan data/angka spesifik. Format: tren → analisis → rekomendasi → risiko.",
  feature:    "Bercerita (storytelling). Mulai dengan hook menarik, bangun narasi, akhiri kuat.",
  sport:      "Energetik dan ekspresif. Pakai istilah olahraga, build excitement, sebut statistik.",
};

// ── Claude API call ──────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt, maxTokens = 1024) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-xxx")) {
    // Mode demo: return mock script
    return mockScript(userPrompt);
  }

  const Anthropic = require("@anthropic-ai/sdk");
  const client    = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const resp = await client.messages.create({
    model:      CLAUDE_MODEL,
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages:   [{ role:"user", content: userPrompt }],
  });

  return resp.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
}

// ── Generate Script Utama ────────────────────────────────────────────────────
async function generateScript({ anchorId, topic, style, channelName, programTitle, maxChars, context }) {
  const persona  = ANCHOR_PERSONAS[anchorId] || ANCHOR_PERSONAS.nova;
  const styleInst= STYLE_INSTRUCTIONS[style]  || STYLE_INSTRUCTIONS.formal;
  const limit    = maxChars || MAX_CHARS;

  const system = `${persona}

INSTRUKSI GAYA: ${styleInst}

ATURAN OUTPUT:
- Maksimal ${limit} karakter
- HANYA output teks script yang akan dibacakan — tanpa judul, tanpa keterangan, tanpa tanda kurung
- Gunakan Bahasa Indonesia yang baik dan natural untuk diucapkan
- Jangan mulai dengan "Halo", langsung masuk konten
- Sesuaikan dengan channel: ${channelName || "AI TV"}
- Program: ${programTitle || "Siaran Langsung"}`;

  const user = context
    ? `Topik: ${topic}\n\nKonteks tambahan:\n${context}`
    : `Topik: ${topic}`;

  const text = await callClaude(system, user, Math.ceil(limit / 2.5));
  return truncateToChar(text, limit);
}

// ── Generate Breaking News ────────────────────────────────────────────────────
async function generateBreakingNews({ headline, details, anchorId }) {
  const persona = ANCHOR_PERSONAS[anchorId] || ANCHOR_PERSONAS.atlas;

  const system = `${persona}
Kamu sedang membacakan BREAKING NEWS di TV live. Gaya: mendesak, jelas, faktual.
Output HANYA teks pembacaan berita — maks 600 karakter. Mulai dengan "BREAKING NEWS:" atau langsung konten.`;

  const user = `Headline: ${headline}\n${details ? `Detail: ${details}` : ""}`;
  const text  = await callClaude(system, user, 400);
  return truncateToChar(text, 600);
}

// ── Generate Opening Program ──────────────────────────────────────────────────
async function generateIntro({ anchorId, programTitle, channelName, topics }) {
  const persona = ANCHOR_PERSONAS[anchorId] || ANCHOR_PERSONAS.nova;

  const system = `${persona}
Buat pembukaan program TV yang menarik dan profesional. Maks 500 karakter.
HANYA output teks yang dibacakan.`;

  const topicList = Array.isArray(topics) ? topics.join(", ") : (topics || "berita terkini");
  const user = `Program: "${programTitle}" di ${channelName}. Topik hari ini: ${topicList}`;

  const text = await callClaude(system, user, 300);
  return truncateToChar(text, 500);
}

// ── Generate Closing Program ──────────────────────────────────────────────────
async function generateClosing({ anchorId, programTitle, nextProgram }) {
  const persona = ANCHOR_PERSONAS[anchorId] || ANCHOR_PERSONAS.nova;

  const system = `${persona}
Buat penutup program TV yang hangat dan profesional. Maks 400 karakter.
HANYA output teks yang dibacakan.`;

  const user = nextProgram
    ? `Tutup program "${programTitle}". Selanjutnya: "${nextProgram}"`
    : `Tutup program "${programTitle}"`;

  const text = await callClaude(system, user, 250);
  return truncateToChar(text, 400);
}

// ── Generate Transition antar anchor ─────────────────────────────────────────
async function generateTransition({ fromAnchorId, toAnchorId, nextTopic, anchors }) {
  const fromAnchor = anchors?.find(a => a.id === fromAnchorId);
  const toAnchor   = anchors?.find(a => a.id === toAnchorId);

  const system = `Kamu adalah ${fromAnchor?.name || "anchor"} yang sedang menyerahkan mic ke rekan.
Buat kalimat transisi natural dan singkat. Maks 200 karakter. HANYA output teks.`;

  const user = `Serahkan ke ${toAnchor?.name || "rekan"} untuk topik: ${nextTopic}`;
  const text  = await callClaude(system, user, 120);
  return truncateToChar(text, 200);
}

// ── Summarize news dari multiple sumber ──────────────────────────────────────
async function summarizeNews({ articles, anchorId, maxPoints = 3 }) {
  const persona = ANCHOR_PERSONAS[anchorId] || ANCHOR_PERSONAS.atlas;

  const system = `${persona}
Buat rangkuman berita dari artikel berikut. Format: ${maxPoints} poin utama, masing-masing 1-2 kalimat.
Maks 700 karakter total. HANYA output teks rangkuman.`;

  const articlesText = articles.slice(0, 5).map((a, i) => `${i+1}. ${a.headline || a.title}: ${a.summary || a.content?.slice(0,200) || ""}`).join("\n");
  const text = await callClaude(system, articlesText, 450);
  return truncateToChar(text, 700);
}

// ── Generate ad-lib / filler saat dead air ────────────────────────────────────
async function generateFiller({ anchorId, channelCategory, durationSec = 30 }) {
  const persona = ANCHOR_PERSONAS[anchorId] || ANCHOR_PERSONAS.nova;

  const system = `${persona}
Buat konten pengisi (filler) selama ±${durationSec} detik untuk channel ${channelCategory}.
Bisa berupa: fun fact, trivia, atau teaser konten berikutnya. Maks 400 karakter. HANYA teks.`;

  const text = await callClaude(system, `Channel: ${channelCategory}. Durasi: ${durationSec} detik`, 250);
  return truncateToChar(text, 400);
}

// ── Mock fallback (tanpa API key) ─────────────────────────────────────────────
function mockScript(prompt) {
  const demos = [
    "Selamat menyaksikan siaran AI TV. Kami hadir 24 jam nonstop untuk menghadirkan informasi terkini yang akurat, cepat, dan terpercaya langsung dari pusat data kami.",
    "Pasar saham Asia bergerak positif hari ini. Indeks AI Global naik 3,2 persen dalam 24 jam terakhir, didorong oleh sentimen positif sektor teknologi dan kecerdasan buatan.",
    "Perkembangan teknologi AI terus mengakselerasi. Dalam 12 bulan terakhir, lebih dari 500 startup AI baru lahir di Asia Tenggara, dengan Indonesia sebagai pemimpin terdepan.",
    "Gaya hidup berbasis AI kini semakin mudah dijangkau. Dari asisten rumah tangga cerdas hingga fashion yang dipersonalisasi oleh algoritma, masa depan telah tiba.",
  ];
  return demos[Math.floor(Math.random() * demos.length)];
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function truncateToChar(text, max) {
  if (!text || text.length <= max) return text || "";
  // Potong di akhir kalimat terdekat
  const cut = text.lastIndexOf(". ", max);
  return cut > max * 0.7 ? text.slice(0, cut + 1) : text.slice(0, max) + "…";
}

module.exports = {
  generateScript,
  generateBreakingNews,
  generateIntro,
  generateClosing,
  generateTransition,
  summarizeNews,
  generateFiller,
};
