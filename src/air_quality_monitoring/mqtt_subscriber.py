from __future__ import annotations

import argparse
import json
from typing import Any

import requests


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bridge MQTT sensor payloads into the ingestion API.")
    parser.add_argument("--broker", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--topic", default="air-quality/readings")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000/api/v1/measurements")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        import paho.mqtt.client as mqtt
    except ImportError as exc:
        raise RuntimeError("paho-mqtt is required. Install the optional mqtt extra first.") from exc

    def on_connect(client: mqtt.Client, userdata: Any, flags: dict, rc: int, properties: Any = None) -> None:
        if rc != 0:
            raise RuntimeError(f"MQTT connection failed with code {rc}")
        client.subscribe(args.topic)
        print(f"Subscribed to {args.topic} on {args.broker}:{args.port}")

    def on_message(client: mqtt.Client, userdata: Any, message: mqtt.MQTTMessage) -> None:
        payload = json.loads(message.payload.decode("utf-8"))
        response = requests.post(args.api_url, json=payload, timeout=10)
        response.raise_for_status()
        print(f"Ingested payload from {payload.get('device_id', 'unknown-device')}")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(args.broker, args.port, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
