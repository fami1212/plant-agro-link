# MQTT → iot-webhook bridge

Petit pont Node.js qui s'abonne aux topics MQTT HiveMQ et transfère chaque
message vers l'edge function `iot-webhook` de Plantéra.

## Convention de topic

```
plantera/devices/<device_token>/<metric>      payload: "23.5"  ou  { value, unit? }
plantera/devices/<device_token>               payload: { metric, value, unit? }
plantera/devices/<device_token>               payload: { readings: [{metric,value,unit?}, …] }
```

## Installation

```bash
cd scripts
npm init -y
npm i mqtt
```

## Variables d'environnement

```bash
export MQTT_BROKER_URL="mqtts://8ded1cdc1db84503ac520685c614eb21.s1.eu.hivemq.cloud:8883"
export MQTT_USERNAME="plantera_agro"
export MQTT_PASSWORD="********"
export IOT_WEBHOOK_URL="https://bgrhahojcelswqichcib.supabase.co/functions/v1/iot-webhook"
export IOT_WEBHOOK_SECRET="********"   # même valeur que dans les secrets Supabase
# optionnel:
export MQTT_TOPIC="plantera/devices/#"
```

## Lancer

```bash
node mqtt-bridge.js
```

Le pont se reconnecte automatiquement et logue chaque message transféré.
Pour un déploiement permanent, utilisez `pm2`, `systemd` ou un conteneur Docker.