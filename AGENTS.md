# Project Notes — PlantErea

- AI edge functions: `ai-proxy` is the direct AI route using secret `GOOGLE_AI_API_KEY` (Google Gemini, `https://generativelanguage.googleapis.com/v1beta`). Default model: `gemini-3.8-flash` — older `gemini-2.x` models are no longer available (404 / 503 spikes possible, retry works).
- All other AI edge functions call Gemini's OpenAI-compatible endpoint (`/v1beta/openai/chat/completions`) with `GOOGLE_AI_API_KEY` and `reasoning_effort: "low"` — why: no dependency on a third-party gateway, and low reasoning keeps small token budgets from returning empty answers.
- Frontend sends only `provider`/`model`/`prompt`/`messages`/`system` to `ai-proxy`; secrets never reach the client.
- Webhook secret for IoT: `IOT_WEBHOOK_SECRET` (HMAC-SHA256, headers `x-plantera-timestamp` + `x-plantera-signature`).
