#!/usr/bin/env node
/**
 * MQTT → iot-webhook bridge
 * --------------------------------
 * Connecte au broker HiveMQ (TLS 8883) et transfère chaque message vers
 * l'edge function `iot-webhook` de Plantéra.
 *
 * Topic attendu : plantera/devices/<device_token>/<metric>
 *   - payload: nombre brut ("23.5") OU JSON {value, unit?, recorded_at?}
 *   - alt: plantera/devices/<device_token> avec payload JSON {metric, value, ...}
 *
 * Variables d'environnement requises :
 *   MQTT_BROKER_URL     ex: mqtts://8ded...hivemq.cloud:8883
 *   MQTT_USERNAME
 *   MQTT_PASSWORD
 *   IOT_WEBHOOK_URL     ex: https://<project>.supabase.co/functions/v1/iot-webhook
 *   IOT_WEBHOOK_SECRET  (le même que dans les secrets Supabase)
 *   MQTT_TOPIC          (optionnel, défaut: plantera/devices/#)
 *
 * Lancement :
 *   npm i mqtt
 *   node scripts/mqtt-bridge.js
 */
const mqtt = require("mqtt");

const {
  MQTT_BROKER_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  IOT_WEBHOOK_URL,
  IOT_WEBHOOK_SECRET,
  MQTT_TOPIC = "plantera/devices/#",
} = process.env;

for (const [k, v] of Object.entries({ MQTT_BROKER_URL, MQTT_USERNAME, MQTT_PASSWORD, IOT_WEBHOOK_URL, IOT_WEBHOOK_SECRET })) {
  if (!v) {
    console.error(`[bridge] Missing env var: ${k}`);
    process.exit(1);
  }
}

const brokerUrl = MQTT_BROKER_URL.startsWith("mqtt") ? MQTT_BROKER_URL : `mqtts://${MQTT_BROKER_URL}`;

console.log("[bridge] Connecting to", brokerUrl);
const client = mqtt.connect(brokerUrl, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 5000,
  rejectUnauthorized: true,
});

client.on("connect", () => {
  console.log("[bridge] Connected. Subscribing to", MQTT_TOPIC);
  client.subscribe(MQTT_TOPIC, (err) => {
    if (err) console.error("[bridge] Subscribe error", err);
  });
});

client.on("error", (err) => console.error("[bridge] MQTT error", err.message));
client.on("reconnect", () => console.log("[bridge] Reconnecting…"));

client.on("message", async (topic, message) => {
  try {
    const parts = topic.split("/"); // plantera/devices/<token>[/<metric>]
    const tokenIdx = parts.indexOf("devices") + 1;
    const device_token = parts[tokenIdx];
    const metricFromTopic = parts[tokenIdx + 1];
    if (!device_token) {
      console.warn("[bridge] No device_token in topic:", topic);
      return;
    }

    const raw = message.toString().trim();
    let payload;
    try { payload = JSON.parse(raw); } catch { payload = null; }

    let body;
    if (Array.isArray(payload?.readings)) {
      body = { device_token, secret: IOT_WEBHOOK_SECRET, readings: payload.readings };
    } else if (payload && typeof payload === "object") {
      body = {
        device_token,
        secret: IOT_WEBHOOK_SECRET,
        metric: payload.metric ?? metricFromTopic,
        value: payload.value,
        unit: payload.unit,
        recorded_at: payload.recorded_at,
      };
    } else {
      const numeric = Number(raw);
      if (!metricFromTopic || Number.isNaN(numeric)) {
        console.warn("[bridge] Cannot parse message", { topic, raw });
        return;
      }
      body = { device_token, secret: IOT_WEBHOOK_SECRET, metric: metricFromTopic, value: numeric };
    }

    const res = await fetch(IOT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[bridge] Webhook error", res.status, await res.text());
    } else {
      console.log("[bridge] →", device_token, body.metric ?? "(batch)", body.value ?? "");
    }
  } catch (e) {
    console.error("[bridge] Handler error", e);
  }
});

process.on("SIGINT", () => { client.end(); process.exit(0); });