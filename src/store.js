"use strict";
/**
 * store.js — In-memory data store (JSON file persistence)
 * Menyimpan semua state TV: channel, anchor, program, script, stream, viewer, chat
 */

const fs   = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const STORE_FILE = path.resolve("./data/tv_store.json");

// ── Seed Data ────────────────────────────────────────────────────────────────
const SEED = {
  channels: [
    { id:"ch01", number:"01", name:"AI NEWS 24",     slug:"ai-news",    category:"Berita",     color:"#00d4ff", emoji:"📡", description:"Berita terkini 24 jam dioperasikan penuh oleh AI jurnalis", defaultAnchorId:"atlas",  isActive:true,  viewers:0, createdAt: ts() },
    { id:"ch02", number:"02", name:"TECH UNIVERSE",  slug:"tech",       category:"Teknologi",  color:"#a29bfe", emoji:"💻", description:"Teknologi & inovasi terdepan bersama AI presenter",        defaultAnchorId:"nova",   isActive:true,  viewers:0, createdAt: ts() },
    { id:"ch03", number:"03", name:"AI LIFESTYLE",   slug:"lifestyle",  category:"Gaya Hidup", color:"#fd79a8", emoji:"✨", description:"Gaya hidup masa depan — fashion, kuliner, travel",         defaultAnchorId:"zara",   isActive:true,  viewers:0, createdAt: ts() },
    { id:"ch04", number:"04", name:"FINANCE AI",     slug:"finance",    category:"Keuangan",   color:"#55efc4", emoji:"📈", description:"Analisis pasar & investasi real-time oleh AI analis",       defaultAnchorId:"orion",  isActive:true,  viewers:0, createdAt: ts() },
    { id:"ch05", number:"05", name:"AI ENTERTAIN",   slug:"entertain",  category:"Hiburan",    color:"#ff9f43", emoji:"🎭", description:"Drama, musik & konten hiburan generatif AI",                defaultAnchorId:"zara",   isActive:false, viewers:0, createdAt: ts() },
    { id:"ch06", number:"06", name:"SPORT INTEL",    slug:"sport",      category:"Olahraga",   color:"#ff3c3c", emoji:"⚽", description:"Komentar & analisis olahraga real-time oleh AI",            defaultAnchorId:"atlas",  isActive:false, viewers:0, createdAt: ts() },
    { id:"ch07", number:"07", name:"AI KIDS",        slug:"kids",       category:"Edukasi",    color:"#ffeaa7", emoji:"🦄", description:"Edukasi & hiburan anak berbasis AI",                       defaultAnchorId:"lyra",   isActive:false, viewers:0, createdAt: ts() },
    { id:"ch08", number:"08", name:"AI SCIENCE",     slug:"science",    category:"Sains",      color:"#74b9ff", emoji:"🔬", description:"Dokumenter sains & eksplorasi alam semesta oleh AI",       defaultAnchorId:"nova",   isActive:false, viewers:0, createdAt: ts() },
  ],

  anchors: [
    { id:"nova",  name:"NOVA",  fullName:"Nova AI",    role:"Anchor Utama",      specialty:"Berita Umum & Teknologi",   aiModel:"claude-sonnet-4-20250514", voiceId:"nova-v3",  gender:"female", language:"id", color:"#00d4ff", emoji:"🤖", personality:"Energetik, cerdas, multibahasa, hangat tapi profesional",               isActive:true,  currentChannelId:"ch02", scriptStyle:"formal",    status:"on-air",  stats:{ totalScripts:0, totalAirTime:0, avgScore:4.8 }, createdAt: ts() },
    { id:"atlas", name:"ATLAS", fullName:"Atlas News", role:"Anchor Berita",     specialty:"Politik, Ekonomi & Dunia",  aiModel:"claude-sonnet-4-20250514", voiceId:"atlas-v2", gender:"male",   language:"id", color:"#a29bfe", emoji:"🧠", personality:"Serius, analitis, tajam, terpercaya seperti anchor senior",           isActive:true,  currentChannelId:"ch01", scriptStyle:"news",      status:"on-air",  stats:{ totalScripts:0, totalAirTime:0, avgScore:4.9 }, createdAt: ts() },
    { id:"lyra",  name:"LYRA",  fullName:"Lyra Field", role:"Reporter Lapangan", specialty:"Feature & Investigasi",     aiModel:"claude-sonnet-4-20250514", voiceId:"lyra-v2",  gender:"female", language:"id", color:"#fd79a8", emoji:"📡", personality:"Curious, investigatif, berani, mampu tanya pertanyaan tajam",         isActive:true,  currentChannelId:null,   scriptStyle:"feature",   status:"standby", stats:{ totalScripts:0, totalAirTime:0, avgScore:4.7 }, createdAt: ts() },
    { id:"orion", name:"ORION", fullName:"Orion Data", role:"Analis Keuangan",   specialty:"Saham, Crypto & Ekonomi",   aiModel:"claude-sonnet-4-20250514", voiceId:"orion-v1", gender:"male",   language:"id", color:"#55efc4", emoji:"📊", personality:"Presisi, data-driven, tenang, selalu backup argumen dengan angka",    isActive:true,  currentChannelId:"ch04", scriptStyle:"analytical",status:"on-air",  stats:{ totalScripts:0, totalAirTime:0, avgScore:4.6 }, createdAt: ts() },
    { id:"zara",  name:"ZARA",  fullName:"Zara Vibe",  role:"Host Hiburan",      specialty:"Lifestyle, Fashion & Musik",aiModel:"claude-sonnet-4-20250514", voiceId:"zara-v3",  gender:"female", language:"id", color:"#ff9f43", emoji:"🎤", personality:"Ceria, menghibur, spontan, selalu bawa energi positif ke layar",     isActive:true,  currentChannelId:"ch03", scriptStyle:"casual",    status:"on-air",  stats:{ totalScripts:0, totalAirTime:0, avgScore:4.8 }, createdAt: ts() },
    { id:"rex",   name:"REX",   fullName:"Rex Sport",  role:"Komentator Olahraga","specialty":"Sepak Bola, Basket & E-Sport",aiModel:"claude-sonnet-4-20250514",voiceId:"rex-v1",gender:"male",language:"id",color:"#ff3c3c",emoji:"⚽",personality:"Antusias, ekspresif, hafal statistik, bisa bangun suspense saat siaran",isActive:false, currentChannelId:null,   scriptStyle:"sport",     status:"off",     stats:{ totalScripts:0, totalAirTime:0, avgScore:4.5 }, createdAt: ts() },
  ],

  guests: [
    { id:"guest01", name:"Dr. Budi Santoso", title:"Pakar AI & Robotika", expertise:"Artificial Intelligence, Machine Learning", aiModel:"claude-sonnet-4-20250514", voiceId:"budi-v1", gender:"male", isActive:true, createdAt: ts() },
    { id:"guest02", name:"Sari Dewi", title:"CEO TechFuture", expertise:"Startup, Investasi, Teknologi Masa Depan", aiModel:"claude-sonnet-4-20250514", voiceId:"sari-v2", gender:"female", isActive:true, createdAt: ts() }
  ],

  programs: [
    { id:"prg01", channelId:"ch01", title:"Selamat Pagi Indonesia",   anchorId:"atlas", startTime:"06:00", endTime:"08:00", durationMin:120, category:"Berita",     description:"Rangkuman berita nasional & internasional semalam",      status:"completed", rating:4.8, viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg02", channelId:"ch02", title:"Tech Morning Show",         anchorId:"nova",  startTime:"08:00", endTime:"09:30", durationMin:90,  category:"Teknologi",  description:"Tren teknologi & startup paling hot minggu ini",          status:"completed", rating:4.7, viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg03", channelId:"ch04", title:"Market Opening Analysis",   anchorId:"orion", startTime:"09:00", endTime:"10:00", durationMin:60,  category:"Keuangan",   description:"Analisis pembukaan pasar IHSG, Forex & Crypto",           status:"live",     rating:4.9, viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg04", channelId:"ch01", title:"Breaking News Update",      anchorId:"atlas", startTime:"10:30", endTime:"11:00", durationMin:30,  category:"Berita",     description:"Update berita terkini setiap 30 menit",                  status:"live",     rating:4.6, viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg05", channelId:"ch02", title:"AI Investigasi Eksklusif",  anchorId:"lyra",  startTime:"11:00", endTime:"12:00", durationMin:60,  category:"Feature",    description:"Investigasi mendalam topik teknologi yang mengubah dunia", status:"scheduled",rating:0,   viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg06", channelId:"ch01", title:"Berita Siang",              anchorId:"atlas", startTime:"12:00", endTime:"12:30", durationMin:30,  category:"Berita",     description:"Ringkasan berita pagi & update terkini",                  status:"scheduled",rating:0,   viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg07", channelId:"ch03", title:"Lifestyle & Beauty AI",     anchorId:"zara",  startTime:"13:00", endTime:"14:30", durationMin:90,  category:"Gaya Hidup", description:"Tips gaya hidup, fashion & kecantikan era AI",            status:"scheduled",rating:0,   viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg08", channelId:"ch04", title:"Closing Bell Market",       anchorId:"orion", startTime:"16:00", endTime:"17:00", durationMin:60,  category:"Keuangan",   description:"Rekap pasar & rekomendasi portofolio akhir hari",         status:"scheduled",rating:0,   viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg09", channelId:"ch02", title:"Prime Time Tech Talk",      anchorId:"nova",  startTime:"20:00", endTime:"21:30", durationMin:90,  category:"Teknologi",  description:"Diskusi mendalam perkembangan AI & masa depan teknologi",  status:"scheduled",rating:0,   viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
    { id:"prg10", channelId:"ch01", title:"Berita Malam",              anchorId:"atlas", startTime:"21:00", endTime:"22:00", durationMin:60,  category:"Berita",     description:"Rangkuman berita harian & editorial AI",                  status:"scheduled",rating:0,   viewerCount:0, aiGenerated:true, scriptIds:[], createdAt: ts() },
  ],

  scripts: [],
  streams: {},       // { platformId: StreamState }
  chatMessages: [],  // live chat dari semua viewer
  broadcastState: {  // state siaran global
    isOnAir:        true,
    activeChannelId:"ch01",
    activeAnchorId: "atlas",
    activeProgramId:"prg04",
    startedAt:      ts(),
    viewerTotal:    847293,
    uptime:         0,
    aiAutopilot:    true,
    emergencyMode:  false,
    currentScript:  null,
  },
  notifications: [],
  aiQueue: [],       // antrian script AI yang akan dibacakan
};

function ts() { return new Date().toISOString(); }

// ── Store Class ──────────────────────────────────────────────────────────────
class Store {
  constructor() {
    this._load();
    // Auto-save setiap 30 detik
    setInterval(() => this._save(), 30000);
  }

  _load() {
    try {
      const raw = fs.readFileSync(STORE_FILE, "utf8");
      this.data = JSON.parse(raw);
      console.log("✅ Store loaded from disk");
    } catch {
      this.data = JSON.parse(JSON.stringify(SEED)); // deep clone
      this._save();
      console.log("✅ Store initialized with seed data");
    }
  }

  _save() {
    fs.mkdirSync("./data", { recursive:true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2));
  }

  // ── Generic ──────────────────────────────────────────────────────────────
  reset() {
    this.data = JSON.parse(JSON.stringify(SEED));
    this._save();
  }

  // ── Channels ─────────────────────────────────────────────────────────────
  getChannels(filter = {}) {
    let list = [...this.data.channels];
    if (filter.active !== undefined) list = list.filter(c => c.isActive === filter.active);
    if (filter.category) list = list.filter(c => c.category === filter.category);
    return list;
  }
  getChannel(id) { return this.data.channels.find(c => c.id === id || c.slug === id) || null; }
  updateChannel(id, fields) {
    const idx = this.data.channels.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.data.channels[idx] = { ...this.data.channels[idx], ...fields, updatedAt: ts() };
    this._save();
    return this.data.channels[idx];
  }
  createChannel(data) {
    const ch = { id: uuidv4(), ...data, viewers:0, createdAt: ts() };
    this.data.channels.push(ch);
    this._save();
    return ch;
  }

  // ── Anchors ──────────────────────────────────────────────────────────────
  getAnchors(filter = {}) {
    let list = [...this.data.anchors];
    if (filter.active !== undefined) list = list.filter(a => a.isActive === filter.active);
    if (filter.status) list = list.filter(a => a.status === filter.status);
    if (filter.channelId) list = list.filter(a => a.currentChannelId === filter.channelId);
    return list;
  }
  getAnchor(id) { return this.data.anchors.find(a => a.id === id) || null; }
  updateAnchor(id, fields) {
    const idx = this.data.anchors.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.data.anchors[idx] = { ...this.data.anchors[idx], ...fields, updatedAt: ts() };
    this._save();
    return this.data.anchors[idx];
  }
  createAnchor(data) {
    const anchor = { id: uuidv4(), ...data, stats:{ totalScripts:0, totalAirTime:0, avgScore:0 }, createdAt: ts() };
    this.data.anchors.push(anchor);
    this._save();
    return anchor;
  }

  // ── Guests (Narasumber) ──────────────────────────────────────────────────
  getGuests(filter = {}) {
    let list = this.data.guests ? [...this.data.guests] : [];
    if (filter.active !== undefined) list = list.filter(g => g.isActive === filter.active);
    return list;
  }
  getGuest(id) { return (this.data.guests || []).find(g => g.id === id) || null; }
  createGuest(data) {
    const guest = { id: uuidv4(), ...data, createdAt: ts() };
    if (!this.data.guests) this.data.guests = [];
    this.data.guests.push(guest);
    this._save();
    return guest;
  }

  // ── Programs ─────────────────────────────────────────────────────────────
  getPrograms(filter = {}) {
    let list = [...this.data.programs];
    if (filter.channelId) list = list.filter(p => p.channelId === filter.channelId);
    if (filter.anchorId)  list = list.filter(p => p.anchorId  === filter.anchorId);
    if (filter.status)    list = list.filter(p => p.status    === filter.status);
    if (filter.date)      list = list.filter(p => p.date      === filter.date);
    return list.sort((a,b) => a.startTime.localeCompare(b.startTime));
  }
  getProgram(id) { return this.data.programs.find(p => p.id === id) || null; }
  createProgram(data) {
    const prg = { id: uuidv4(), ...data, viewerCount:0, scriptIds:[], aiGenerated:true, createdAt: ts() };
    this.data.programs.push(prg);
    this._save();
    return prg;
  }
  updateProgram(id, fields) {
    const idx = this.data.programs.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.data.programs[idx] = { ...this.data.programs[idx], ...fields, updatedAt: ts() };
    this._save();
    return this.data.programs[idx];
  }
  deleteProgram(id) {
    const idx = this.data.programs.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.data.programs.splice(idx, 1);
    this._save();
    return true;
  }

  // ── Scripts ──────────────────────────────────────────────────────────────
  getScripts(filter = {}) {
    let list = [...this.data.scripts];
    if (filter.anchorId)  list = list.filter(s => s.anchorId  === filter.anchorId);
    if (filter.programId) list = list.filter(s => s.programId === filter.programId);
    if (filter.channelId) list = list.filter(s => s.channelId === filter.channelId);
    if (filter.status)    list = list.filter(s => s.status    === filter.status);
    if (filter.priority)  list = list.filter(s => s.priority  === filter.priority);
    const limit = filter.limit || 50;
    return list.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0, limit);
  }
  getScript(id) { return this.data.scripts.find(s => s.id === id) || null; }
  createScript(data) {
    const scr = {
      id: uuidv4(),
      status:   "queued",
      priority: "medium",
      aiGenerated: false,
      readCount: 0,
      ...data,
      createdAt: ts(),
    };
    this.data.scripts.unshift(scr);
    this._save();
    return scr;
  }
  updateScript(id, fields) {
    const idx = this.data.scripts.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.data.scripts[idx] = { ...this.data.scripts[idx], ...fields, updatedAt: ts() };
    this._save();
    return this.data.scripts[idx];
  }
  deleteScript(id) {
    const idx = this.data.scripts.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.data.scripts.splice(idx, 1);
    this._save();
    return true;
  }
  getNextQueuedScript(anchorId) {
    const q = this.data.scripts
      .filter(s => s.status === "queued" && (!anchorId || s.anchorId === anchorId))
      .sort((a,b) => {
        const prio = { urgent:0, high:1, medium:2, low:3 };
        return (prio[a.priority]||2) - (prio[b.priority]||2);
      });
    return q[0] || null;
  }

  // ── Streams ───────────────────────────────────────────────────────────────
  getStreams() { return Object.values(this.data.streams); }
  getStream(platformId) { return this.data.streams[platformId] || null; }
  setStream(platformId, state) {
    this.data.streams[platformId] = { ...state, platformId, updatedAt: ts() };
    this._save();
    return this.data.streams[platformId];
  }
  removeStream(platformId) {
    delete this.data.streams[platformId];
    this._save();
  }

  // ── Broadcast State ───────────────────────────────────────────────────────
  getBroadcastState() { return { ...this.data.broadcastState }; }
  updateBroadcastState(fields) {
    this.data.broadcastState = { ...this.data.broadcastState, ...fields, updatedAt: ts() };
    this._save();
    return this.data.broadcastState;
  }

  // ── Chat Messages ─────────────────────────────────────────────────────────
  getChats(limit = 50) { return this.data.chatMessages.slice(-limit); }
  addChat(msg) {
    const chat = { id: uuidv4(), ...msg, timestamp: ts() };
    this.data.chatMessages.push(chat);
    if (this.data.chatMessages.length > 500) this.data.chatMessages = this.data.chatMessages.slice(-500);
    this._save();
    return chat;
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  addNotification(notif) {
    const n = { id: uuidv4(), read:false, ...notif, createdAt: ts() };
    this.data.notifications.unshift(n);
    if (this.data.notifications.length > 100) this.data.notifications = this.data.notifications.slice(0,100);
    this._save();
    return n;
  }
  getNotifications(unreadOnly = false) {
    return unreadOnly ? this.data.notifications.filter(n => !n.read) : this.data.notifications.slice(0,50);
  }

  // ── AI Queue ───────────────────────────────────────────────────────────────
  enqueueAI(item) { this.data.aiQueue.push({ id:uuidv4(), ...item, queuedAt:ts() }); this._save(); }
  dequeueAI() { const item = this.data.aiQueue.shift(); this._save(); return item || null; }
  getAIQueue() { return [...this.data.aiQueue]; }
}

module.exports = new Store();
