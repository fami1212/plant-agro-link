# Project Notes — PlantErea

- AI edge functions: `ai-proxy` is the direct AI route using secret `GOOGLE_AI_API_KEY` (Google Gemini, `https://generativelanguage.googleapis.com/v1beta`). Default model: `gemini-3.8-flash` — older `gemini-2.x` models are no longer available (404 / 503 spikes possible, retry works).
- Eleven other AI edge functions (weather-data, detect-disease, smart-planner, smart-camera-analyze, ai-risk-score, irrigation-recommendations, ai-assistant, market-prices, ai-farm-sentinel, predict-yield, ai-contextual-tip) still call the legacy AI gateway with `google/gemini-2.5-flash` — migration to direct Gemini calls pending user decision.
- Frontend sends only `provider`/`model`/`prompt`/`messages`/`system` to `ai-proxy`; secrets never reach the client.
- Webhook secret for IoT: `IOT_WEBHOOK_SECRET` (HMAC-SHA256, headers `x-plantera-timestamp` + `x-plantera-signature`).
