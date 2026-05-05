# Sam — AI Thinking Partner

## Project Overview
Sam is a real-time AI thinking partner that helps users structure, 
challenge, and expand their thoughts. Built on Groq's low-latency 
streaming API with ElevenLabs voice output.

## Monorepo Structure
- `apps/api` — Express + TypeScript backend (port 4000)
- `apps/web` — Next.js 14 frontend (port 3000)
- Package manager: pnpm with workspaces

## Key Backend Endpoints
- `POST /api/v1/unfold` — SSE streaming, returns structured JSON breakdown
- `POST /api/v1/speak` — ElevenLabs TTS proxy, returns audio/mpeg
- `GET /health` — health check

## Tech Stack
- Backend: Express, TypeScript, groq-sdk, elevenlabs, dotenv
- Frontend: Next.js 14 App Router, Tailwind, shadcn/ui, Framer Motion
- AI: Groq (llama-3.3-70b-versatile), ElevenLabs (eleven_turbo_v2_5)

## Environment Variables
apps/api/.env needs:
  GROQ_API_KEY=
  ELEVENLABS_API_KEY=
  API_PORT=4000 (optional)

## Dev Commands
From root: pnpm install
api: cd apps/api && pnpm dev
web: cd apps/web && pnpm dev

## Architecture Direction
Option C — Sam's thinking partner core + an Assistant Mode layer 
on top with tool routing (Groq decides which tool to invoke). 
Next milestone: build the tool router.

## Rules for AI Editors
- Never touch .env files
- Backend and frontend are always separate PRs/tasks
- Streaming pattern: SSE from backend, fetch + ReadableStream on frontend
- No Vercel AI SDK — raw streaming only (learning project)
