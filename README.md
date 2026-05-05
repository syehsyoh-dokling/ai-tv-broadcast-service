# AI TV Broadcast Service

Express API for TV-style broadcast automation, program management, AI script generation, stream control, autopilot operations, chat, and viewing stats.

## Capabilities

- Manage channels, anchors, programs, scripts, and guests.
- Generate broadcast scripts and related AI content.
- Track live stream platforms and stream status.
- Start, stop, and update stream records.
- Control broadcast state and autopilot mode.
- Store chat, notifications, and viewer metrics in local state.

## Tech Stack

- Node.js and Express.
- Anthropic SDK for AI-assisted generation.
- Local store in `src/store.js`.
- Service modules for AI, autopilot, and stream workflows.

## Structure

```text
server.js
src/
  middleware/helpers.js
  routes/index.js
  services/aiService.js
  services/autopilotService.js
  services/streamService.js
  store.js
API_DOCS.md
```

## Quick Start

```bash
npm install
copy .env.example .env
npm start
```

Development mode:

```bash
npm run dev
```

## API Areas

```text
/api/channels
/api/anchors
/api/programs
/api/scripts
/api/stream
/api/broadcast
/api/autopilot
/api/guests
/api/chat
/api/stats
/api/notifications
/api/health
```

Detailed endpoint notes are in `API_DOCS.md`.

## Environment

Use `.env.example` as the template for provider keys and service settings. Do not commit real API keys.

## Repository Boundary

This repo is for TV/broadcast API automation only. Queue workers, deployment configs, and API hub services live separately.
