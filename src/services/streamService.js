"use strict";
/**
 * streamService.js — Manajemen streaming ke berbagai platform
 *
 * Simulasi RTMP streaming state management.
 * Pada implementasi nyata, ini akan memanggil FFmpeg atau OBS WebSocket API
 * untuk push stream ke YouTube/TikTok/Meta/Instagram secara bersamaan.
 */

require("dotenv").config();
const store = require("../store");

// ── Platform Registry ─────────────────────────────────────────────────────────
const PLATFORMS = {
  youtube: {
    id:          "youtube",
    name:        "YouTube Live",
    rtmpUrl:     process.env.YOUTUBE_RTMP_URL     || "rtmp://a.rtmp.youtube.com/live2",
    streamKey:   process.env.YOUTUBE_STREAM_KEY   || "",
    color:       "#FF0000",
    maxBitrate:  "9000kbps",
    resolutions: ["1080p60","1080p30","720p60","720p30","480p"],
    defaultRes:  "1080p30",
    latencyMode: "normal",   // normal | low | ultralow
  },
  tiktok: {
    id:          "tiktok",
    name:        "TikTok LIVE",
    rtmpUrl:     process.env.TIKTOK_RTMP_URL      || "rtmp://push.tiktok.com/rtmp",
    streamKey:   process.env.TIKTOK_STREAM_KEY    || "",
    color:       "#69C9D0",
    maxBitrate:  "4000kbps",
    resolutions: ["1080p30","720p30","480p"],
    defaultRes:  "720p30",
    latencyMode: "low",
  },
  facebook: {
    id:          "facebook",
    name:        "Facebook Live",
    rtmpUrl:     process.env.FACEBOOK_RTMP_URL    || "rtmps://live-api-s.facebook.com/rtmp",
    streamKey:   process.env.FACEBOOK_STREAM_KEY  || "",
    color:       "#1877F2",
    maxBitrate:  "6000kbps",
    resolutions: ["1080p30","720p30","480p"],
    defaultRes:  "1080p30",
    latencyMode: "normal",
  },
  instagram: {
    id:          "instagram",
    name:        "Instagram Live",
    rtmpUrl:     process.env.INSTAGRAM_RTMP_URL   || "rtmp://live-upload.instagram.com/rtmp",
    streamKey:   process.env.INSTAGRAM_STREAM_KEY || "",
    color:       "#E1306C",
    maxBitrate:  "3500kbps",
    resolutions: ["720p30","480p"],
    defaultRes:  "720p30",
    latencyMode: "normal",
  },
  custom: {
    id:          "custom",
    name:        "Custom RTMP / OTT",
    rtmpUrl:     process.env.CUSTOM_RTMP_URL      || "",
    streamKey:   process.env.CUSTOM_STREAM_KEY    || "",
    color:       "#00d4ff",
    maxBitrate:  "15000kbps",
    resolutions: ["4K30","1080p60","1080p30","720p60","720p30"],
    defaultRes:  "1080p60",
    latencyMode: "ultralow",
  },
};

// ── Simulasi health metrics per stream ────────────────────────────────────────
function mockStreamHealth(platformId) {
  const base = { youtube:3800, tiktok:2200, facebook:2800, instagram:2000, custom:5500 };
  const noise = () => Math.floor(Math.random() * 200 - 100);
  return {
    bitrate:     (base[platformId] || 3000) + noise(),
    fps:         Math.random() > 0.05 ? 30 : 29,
    droppedFrames: Math.floor(Math.random() * 3),
    latencyMs:   Math.floor(1200 + Math.random() * 800),
    signalQuality: Math.random() > 0.1 ? "good" : "fair",
    uptimeSeconds: Math.floor(Date.now() / 1000) % 86400,
  };
}

// ── Start Stream ───────────────────────────────────────────────────────────────
async function startStream({ platformId, resolution, streamKey, rtmpUrl, channelId }) {
  const platform = PLATFORMS[platformId];
  if (!platform) throw new Error(`Platform tidak dikenal: ${platformId}`);

  const existing = store.getStream(platformId);
  if (existing && existing.status === "live") {
    throw new Error(`Stream ${platform.name} sudah aktif`);
  }

  const finalKey  = streamKey || platform.streamKey;
  const finalUrl  = rtmpUrl   || platform.rtmpUrl;
  const finalRes  = resolution|| platform.defaultRes;

  if (!finalKey) throw new Error(`Stream key untuk ${platform.name} belum dikonfigurasi`);

  // Di implementasi nyata: spawn FFmpeg process
  // const proc = spawnFFmpeg(finalUrl, finalKey, finalRes);

  const streamState = {
    platformId,
    platformName: platform.name,
    status:       "live",
    rtmpUrl:      finalUrl,
    streamKey:    maskKey(finalKey),
    resolution:   finalRes,
    channelId:    channelId || store.getBroadcastState().activeChannelId,
    startedAt:    new Date().toISOString(),
    viewers:      0,
    color:        platform.color,
    health:       mockStreamHealth(platformId),
    // pid: proc.pid  // untuk kill nanti
  };

  store.setStream(platformId, streamState);
  store.addNotification({
    type:    "stream_start",
    level:   "success",
    message: `Stream ${platform.name} dimulai (${finalRes})`,
  });

  return streamState;
}

// ── Stop Stream ────────────────────────────────────────────────────────────────
async function stopStream(platformId) {
  const stream = store.getStream(platformId);
  if (!stream) throw new Error(`Stream ${platformId} tidak ditemukan`);
  if (stream.status === "stopped") throw new Error(`Stream ${platformId} sudah berhenti`);

  // Di implementasi nyata: kill FFmpeg process by pid
  const startedAt  = new Date(stream.startedAt);
  const durationSec= Math.floor((Date.now() - startedAt.getTime()) / 1000);

  const stopped = {
    ...stream,
    status:      "stopped",
    stoppedAt:   new Date().toISOString(),
    durationSec,
  };

  store.setStream(platformId, stopped);
  store.addNotification({
    type:    "stream_stop",
    level:   "info",
    message: `Stream ${stream.platformName} dihentikan setelah ${Math.floor(durationSec/60)} menit`,
  });

  return stopped;
}

// ── Start All ─────────────────────────────────────────────────────────────────
async function startAllStreams({ resolution, channelId, platforms: ids }) {
  const targets = ids || ["youtube","tiktok","facebook","instagram"];
  const results = { started:[], failed:[] };

  for (const id of targets) {
    try {
      const s = await startStream({ platformId:id, resolution, channelId });
      results.started.push({ platformId:id, platformName:s.platformName });
    } catch (e) {
      results.failed.push({ platformId:id, error:e.message });
    }
  }
  return results;
}

// ── Stop All ──────────────────────────────────────────────────────────────────
async function stopAllStreams() {
  const live    = store.getStreams().filter(s => s.status === "live");
  const results = { stopped:[], failed:[] };

  for (const s of live) {
    try {
      await stopStream(s.platformId);
      results.stopped.push(s.platformId);
    } catch (e) {
      results.failed.push({ platformId:s.platformId, error:e.message });
    }
  }
  return results;
}

// ── Get Health (refresh metrics) ──────────────────────────────────────────────
function refreshStreamHealth(platformId) {
  const stream = store.getStream(platformId);
  if (!stream || stream.status !== "live") return null;

  const health = mockStreamHealth(platformId);
  // Simulasi viewer growth
  const viewers = Math.max(0, (stream.viewers || 0) + Math.floor(Math.random()*50 - 20));
  store.setStream(platformId, { ...stream, health, viewers });
  return { ...stream, health, viewers };
}

// ── Get All Streams Status ────────────────────────────────────────────────────
function getAllStreamStatus() {
  const active  = store.getStreams();
  const all     = Object.values(PLATFORMS).map(p => {
    const running = active.find(s => s.platformId === p.id);
    return {
      platformId:  p.id,
      platformName:p.name,
      color:       p.color,
      status:      running?.status || "stopped",
      resolution:  running?.resolution || p.defaultRes,
      viewers:     running?.viewers || 0,
      startedAt:   running?.startedAt || null,
      health:      running?.health || null,
      configured:  !!p.streamKey,
      availableResolutions: p.resolutions,
      latencyMode: p.latencyMode,
    };
  });
  return all;
}

// ── Update stream config ──────────────────────────────────────────────────────
function updateStreamConfig(platformId, { streamKey, rtmpUrl, resolution }) {
  const platform = PLATFORMS[platformId];
  if (!platform) throw new Error(`Platform tidak dikenal: ${platformId}`);
  if (streamKey)  platform.streamKey  = streamKey;
  if (rtmpUrl)    platform.rtmpUrl    = rtmpUrl;
  if (resolution) platform.defaultRes = resolution;
  return { platformId, updated: true };
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function maskKey(key) {
  if (!key || key.length < 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

function getPlatformList() {
  return Object.values(PLATFORMS).map(p => ({
    id:          p.id,
    name:        p.name,
    color:       p.color,
    configured:  !!p.streamKey,
    defaultRes:  p.defaultRes,
    resolutions: p.resolutions,
    latencyMode: p.latencyMode,
    maxBitrate:  p.maxBitrate,
  }));
}

module.exports = {
  startStream,
  stopStream,
  startAllStreams,
  stopAllStreams,
  refreshStreamHealth,
  getAllStreamStatus,
  updateStreamConfig,
  getPlatformList,
  PLATFORMS,
};
