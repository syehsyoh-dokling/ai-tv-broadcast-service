# 🎬 AI TV API — Dokumentasi Lengkap

**Base URL:** `http://localhost:4000/api`

---

## 📺 CHANNELS

### GET /channels
```bash
curl http://localhost:4000/api/channels
curl "http://localhost:4000/api/channels?active=true&category=Berita"
```

### GET /channels/:id
```bash
curl http://localhost:4000/api/channels/ch01
```

### POST /channels
```bash
curl -X POST http://localhost:4000/api/channels \
  -H "Content-Type: application/json" \
  -d '{"name":"AI COOKING","number":"09","category":"Kuliner","color":"#e17055","emoji":"🍳","description":"Resep & masak bersama AI chef","defaultAnchorId":"zara"}'
```

### PUT /channels/:id
```bash
curl -X PUT http://localhost:4000/api/channels/ch01 \
  -H "Content-Type: application/json" \
  -d '{"description":"Channel berita terbaru 2025"}'
```

### PATCH /channels/:id/activate
```bash
curl -X PATCH http://localhost:4000/api/channels/ch05/activate \
  -H "Content-Type: application/json" \
  -d '{"isActive":true}'
```

---

## 🤖 ANCHORS

### GET /anchors
```bash
curl http://localhost:4000/api/anchors
curl "http://localhost:4000/api/anchors?status=on-air"
curl "http://localhost:4000/api/anchors?active=true"
```

### GET /anchors/:id
```bash
curl http://localhost:4000/api/anchors/nova
```

### POST /anchors
```bash
curl -X POST http://localhost:4000/api/anchors \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LUNA",
    "fullName": "Luna Sains",
    "role": "Host Sains & Alam",
    "specialty": "Astronomi, Fisika & Biologi",
    "personality": "Intelektual, penasaran, pandai sederhanakan hal kompleks",
    "scriptStyle": "feature",
    "color": "#74b9ff",
    "emoji": "🔭",
    "gender": "female"
  }'
```

### PUT /anchors/:id
```bash
curl -X PUT http://localhost:4000/api/anchors/nova \
  -H "Content-Type: application/json" \
  -d '{"personality":"Lebih energetik dan humor ringan","color":"#00cec9"}'
```

### PATCH /anchors/:id/status
```bash
# Ubah ke on-air / standby / off
curl -X PATCH http://localhost:4000/api/anchors/lyra/status \
  -H "Content-Type: application/json" \
  -d '{"status":"on-air"}'
```

### PATCH /anchors/:id/assign
```bash
# Assign anchor ke channel tertentu
curl -X PATCH http://localhost:4000/api/anchors/lyra/assign \
  -H "Content-Type: application/json" \
  -d '{"channelId":"ch01"}'
```

---

## 📋 PROGRAMS

### GET /programs
```bash
curl http://localhost:4000/api/programs
curl "http://localhost:4000/api/programs?channelId=ch01&status=live"
curl "http://localhost:4000/api/programs?anchorId=atlas"
```

### POST /programs
```bash
curl -X POST http://localhost:4000/api/programs \
  -H "Content-Type: application/json" \
  -d '{
    "channelId":   "ch01",
    "title":       "Malam Bersama AI",
    "anchorId":    "atlas",
    "startTime":   "22:00",
    "endTime":     "23:00",
    "durationMin": 60,
    "category":    "Berita",
    "description": "Rangkuman malam & editorial AI"
  }'
```

### PATCH /programs/:id/status
```bash
curl -X PATCH http://localhost:4000/api/programs/prg04/status \
  -H "Content-Type: application/json" \
  -d '{"status":"live"}'
```

### DELETE /programs/:id
```bash
curl -X DELETE http://localhost:4000/api/programs/prg09
```

---

## 📝 SCRIPTS

### GET /scripts
```bash
curl http://localhost:4000/api/scripts
curl "http://localhost:4000/api/scripts?status=queued&anchorId=nova"
curl "http://localhost:4000/api/scripts?priority=urgent&limit=10"
```

### GET /scripts/next  ← UI panggil ini setiap selesai baca 1 script
```bash
curl "http://localhost:4000/api/scripts/next?anchorId=atlas"
```

### POST /scripts  ← Buat script manual dari admin
```bash
curl -X POST http://localhost:4000/api/scripts \
  -H "Content-Type: application/json" \
  -d '{
    "anchorId": "nova",
    "channelId": "ch02",
    "topic": "Peluncuran Chip AI Terbaru",
    "text": "Hari ini menjadi tonggak bersejarah bagi industri semikonduktor...",
    "priority": "high",
    "style": "news"
  }'
```

### POST /scripts/generate  ← Generate via AI (Claude/GPT)
```bash
curl -X POST http://localhost:4000/api/scripts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "anchorId":   "atlas",
    "topic":      "Regulasi AI Global yang Baru Ditandatangani",
    "style":      "news",
    "channelId":  "ch01",
    "maxChars":   800,
    "saveToQueue": true
  }'
```

### POST /scripts/generate/breaking  ← Breaking news darurat
```bash
curl -X POST http://localhost:4000/api/scripts/generate/breaking \
  -H "Content-Type: application/json" \
  -d '{
    "headline": "Gempa 7.2 SR Guncang Sulawesi — AI Prediksi 3 Hari Lalu",
    "details":  "BMKG konfirmasi gempa pukul 14.32 WIB. Tidak ada potensi tsunami.",
    "anchorId": "atlas"
  }'
```

### POST /scripts/generate/intro
```bash
curl -X POST http://localhost:4000/api/scripts/generate/intro \
  -H "Content-Type: application/json" \
  -d '{
    "anchorId":     "nova",
    "programTitle": "Tech Universe Malam Ini",
    "channelName":  "TECH UNIVERSE",
    "topics":       ["AI chip terbaru","Startup unicorn baru","Hacker AI vs Keamanan Siber"],
    "saveToQueue":  true
  }'
```

### POST /scripts/generate/closing
```bash
curl -X POST http://localhost:4000/api/scripts/generate/closing \
  -H "Content-Type: application/json" \
  -d '{
    "anchorId":     "atlas",
    "programTitle": "Berita Siang",
    "nextProgram":  "Lifestyle & Beauty AI",
    "saveToQueue":  true
  }'
```

### POST /scripts/generate/transition  ← Serah terima anchor
```bash
curl -X POST http://localhost:4000/api/scripts/generate/transition \
  -H "Content-Type: application/json" \
  -d '{
    "fromAnchorId": "atlas",
    "toAnchorId":   "orion",
    "nextTopic":    "Analisis closing market IHSG hari ini",
    "saveToQueue":  true
  }'
```

### POST /scripts/generate/summary  ← Rangkum artikel berita
```bash
curl -X POST http://localhost:4000/api/scripts/generate/summary \
  -H "Content-Type: application/json" \
  -d '{
    "anchorId":  "atlas",
    "maxPoints": 3,
    "articles": [
      {"headline":"Indonesia Jadi Hub AI ASEAN","summary":"Pemerintah rilis peta jalan AI nasional 2025-2030"},
      {"headline":"OpenAI Luncurkan Model Baru","summary":"GPT-5 diklaim 10x lebih cepat dari pendahulunya"},
      {"headline":"Saham Teknologi Melesat","summary":"IHSG sektor tech naik 4.2% didorong sentimen AI"}
    ]
  }'
```

### PATCH /scripts/:id/status  ← UI update saat mulai/selesai baca
```bash
# Saat mulai dibacakan
curl -X PATCH http://localhost:4000/api/scripts/SCRIPT_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"on-air"}'

# Setelah selesai dibacakan
curl -X PATCH http://localhost:4000/api/scripts/SCRIPT_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}'
```

---

## 📡 STREAMING

### GET /stream/platforms
```bash
curl http://localhost:4000/api/stream/platforms
```

### GET /stream/status
```bash
curl http://localhost:4000/api/stream/status
```

### POST /stream/start  ← Start satu platform
```bash
curl -X POST http://localhost:4000/api/stream/start \
  -H "Content-Type: application/json" \
  -d '{
    "platformId": "youtube",
    "resolution": "1080p30",
    "streamKey":  "xxxx-xxxx-xxxx-xxxx"
  }'
```

### POST /stream/start-all  ← Start semua platform sekaligus
```bash
curl -X POST http://localhost:4000/api/stream/start-all \
  -H "Content-Type: application/json" \
  -d '{"resolution":"1080p30","platforms":["youtube","tiktok","facebook","instagram"]}'
```

### POST /stream/stop
```bash
curl -X POST http://localhost:4000/api/stream/stop \
  -H "Content-Type: application/json" \
  -d '{"platformId":"tiktok"}'
```

### POST /stream/stop-all
```bash
curl -X POST http://localhost:4000/api/stream/stop-all
```

### GET /stream/:id/health
```bash
curl http://localhost:4000/api/stream/youtube/health
```
**Response:**
```json
{
  "health": {
    "bitrate": 3842,
    "fps": 30,
    "droppedFrames": 1,
    "latencyMs": 1450,
    "signalQuality": "good",
    "uptimeSeconds": 3621
  },
  "viewers": 12400
}
```

### PUT /stream/:id/config
```bash
curl -X PUT http://localhost:4000/api/stream/youtube/config \
  -H "Content-Type: application/json" \
  -d '{"streamKey":"new-key-xxxx","resolution":"1080p60"}'
```

---

## 🎛 BROADCAST STATE

### GET /broadcast/state  ← State global siaran
```bash
curl http://localhost:4000/api/broadcast/state
```

### POST /broadcast/go-live  ← MULAI SIARAN
```bash
curl -X POST http://localhost:4000/api/broadcast/go-live \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "ch01",
    "anchorId":  "atlas",
    "autoStream": true
  }'
```

### POST /broadcast/end  ← AKHIRI SIARAN
```bash
curl -X POST http://localhost:4000/api/broadcast/end
```

### PATCH /broadcast/channel  ← Ganti channel aktif
```bash
curl -X PATCH http://localhost:4000/api/broadcast/channel \
  -H "Content-Type: application/json" \
  -d '{"channelId":"ch04"}'
```

### PATCH /broadcast/anchor  ← Switch anchor live
```bash
curl -X PATCH http://localhost:4000/api/broadcast/anchor \
  -H "Content-Type: application/json" \
  -d '{"anchorId":"orion"}'
```

### PATCH /broadcast/program  ← Set program aktif
```bash
curl -X PATCH http://localhost:4000/api/broadcast/program \
  -H "Content-Type: application/json" \
  -d '{"programId":"prg03"}'
```

### POST /broadcast/emergency  ← Toggle darurat
```bash
curl -X POST http://localhost:4000/api/broadcast/emergency \
  -H "Content-Type: application/json" \
  -d '{"enable":true}'
```

---

## 🤖 AUTOPILOT

```bash
# Status
curl http://localhost:4000/api/autopilot/status

# Aktifkan
curl -X POST http://localhost:4000/api/autopilot/start

# Matikan
curl -X POST http://localhost:4000/api/autopilot/stop
```

---

## 💬 CHAT

```bash
# Ambil 50 pesan terakhir
curl http://localhost:4000/api/chat

# Kirim pesan
curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"username":"Penonton123","message":"Nova keren banget!","channelId":"ch02"}'
```

---

## 📊 STATS & NOTIFIKASI

```bash
# Statistik lengkap
curl http://localhost:4000/api/stats

# Viewer realtime (time-series 10 menit)
curl http://localhost:4000/api/stats/viewers

# Notifikasi sistem
curl http://localhost:4000/api/notifications
curl "http://localhost:4000/api/notifications?unread=true"

# Health check
curl http://localhost:4000/api/health
```

---

## 🔄 Alur Integrasi UI ↔ API

```
1. App boot
   GET /broadcast/state       → tampilkan state awal

2. Admin klik "ON AIR"
   POST /broadcast/go-live    → mulai siaran + generate intro
   POST /stream/start-all     → push ke semua platform

3. UI loop script (setiap anchor selesai baca)
   GET /scripts/next          → ambil script berikutnya
   PATCH /scripts/:id/status  → set "on-air"
   ... anchor membaca ...
   PATCH /scripts/:id/status  → set "done"
   GET /scripts/next          → ambil berikutnya (dst)

4. Admin inject breaking news
   POST /scripts/generate/breaking → generate + masuk queue prioritas URGENT

5. Admin ganti anchor live
   POST /scripts/generate/transition → generate kalimat serah terima
   PATCH /broadcast/anchor           → switch anchor

6. Monitor stream
   GET /stream/youtube/health  → cek bitrate, fps, viewers (polling tiap 5s)

7. Admin akhiri siaran
   POST /broadcast/end         → stop semua stream + reset state
```

---

## ⚙️ Setup

```bash
cp .env.example .env
# Isi ANTHROPIC_API_KEY dan STREAM KEYS di .env
npm install
npm start
# Server: http://localhost:4000
# Docs:   http://localhost:4000/
```
