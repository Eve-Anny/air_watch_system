from __future__ import annotations

from datetime import datetime

import pandas as pd
import plotly.express as px
import requests
import streamlit as st

from air_quality_monitoring.config import Settings
from air_quality_monitoring.domain.models import AlertStatus


POLLUTANT_COLUMNS = ["pm25", "pm10", "no2", "so2", "o3", "voc", "temperature", "humidity"]


def main() -> None:
    settings = Settings.from_env()
    st.set_page_config(
        page_title="Air Quality Monitoring Dashboard",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    apply_theme()

    if "seeded_once" not in st.session_state:
        st.session_state.seeded_once = False

    st.title("Air Quality Monitoring Dashboard")
    st.caption("Real-time monitoring, alerts, and AQI intelligence for your IoT air quality project.")

    with st.sidebar:
        st.subheader("Control Panel")
        api_url = st.text_input("API base URL", value=settings.dashboard_api_url).rstrip("/")
        device_filter = st.text_input("Device filter", value="")
        refresh_requested = st.button("Refresh data", use_container_width=True)
        if st.button("Seed demo data", use_container_width=True):
            post_json(f"{api_url}/api/v1/simulator/seed?count=72")
            st.session_state.seeded_once = True
            st.rerun()
        if st.button("Train ML model", use_container_width=True):
            response = post_json(f"{api_url}/api/v1/models/train")
            if response is not None:
                st.success(f"Model trained: {response.get('version', 'unknown version')}")
            st.rerun()
        st.caption("If the backend is empty, the dashboard can seed realistic demo data.")

    if refresh_requested:
        st.rerun()

    summary = get_json(f"{api_url}/api/v1/summary", params=clean_params(device_filter))
    if summary is None:
        st.error("Backend is unreachable. Start the API first, then rerun the dashboard.")
        st.code("uvicorn air_quality_monitoring.api.app:app --reload --host 127.0.0.1 --port 8000")
        return

    if (
        summary["latest_measurement"] is None
        and settings.auto_seed_demo
        and not st.session_state.seeded_once
    ):
        post_json(f"{api_url}/api/v1/simulator/seed?count=72")
        st.session_state.seeded_once = True
        st.rerun()

    measurements = get_json(
        f"{api_url}/api/v1/measurements",
        params={"limit": 240, **clean_params(device_filter)},
    ) or []
    alerts = get_json(
        f"{api_url}/api/v1/alerts",
        params={"limit": 100, **clean_params(device_filter)},
    ) or []

    render_overview(summary, alerts)
    render_measurement_charts(measurements)
    render_alerts(api_url, alerts)
    render_manual_ingestion(api_url)


def clean_params(device_filter: str) -> dict[str, str]:
    return {"device_id": device_filter.strip()} if device_filter.strip() else {}


def render_overview(summary: dict, alerts: list[dict]) -> None:
    latest = summary.get("latest_measurement")
    stats = summary.get("stats", {})
    model_status = summary.get("model_status", {})
    open_alerts = [item for item in alerts if item["status"] == AlertStatus.OPEN.value]

    left, middle, right, far_right = st.columns(4)
    left.metric("Measurements", stats.get("measurement_count", 0))
    middle.metric("Average AQI", stats.get("aqi_average") or "N/A")
    right.metric("Peak AQI", stats.get("aqi_peak") or "N/A")
    far_right.metric("Open alerts", len(open_alerts))

    if latest is None:
        st.info("No readings yet. Use 'Seed demo data' to populate the dashboard.")
        return

    st.subheader("Latest Reading")
    headline, details = st.columns([2, 1])
    with headline:
        st.markdown(
            f"""
            <div class="hero-card">
                <div class="hero-top">
                    <span class="hero-badge">{latest['location']}</span>
                    <span class="hero-time">{format_dt(latest['timestamp'])}</span>
                </div>
                <h2>AQI {latest['computed_index']} | {latest['aqi_category']}</h2>
                <p>Dominant pollutant: {latest['dominant_pollutant'].upper()}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with details:
        status_text = "Available" if model_status.get("available") else "Not trained"
        st.write(f"Model: {status_text}")
        st.write(f"Version: {model_status.get('version') or 'N/A'}")
        st.write(f"Samples: {model_status.get('training_samples', 0)}")

    metrics = st.columns(4)
    cards = [
        ("PM2.5", latest["pm25"], "ug/m3"),
        ("PM10", latest["pm10"], "ug/m3"),
        ("NO2", latest["no2"], "ug/m3"),
        ("O3", latest["o3"], "ug/m3"),
        ("SO2", latest["so2"], "ug/m3"),
        ("VOC", latest["voc"] or 0, "ppb"),
        ("Temperature", latest["temperature"], "C"),
        ("Humidity", latest["humidity"], "%"),
    ]
    for index, (label, value, unit) in enumerate(cards):
        metrics[index % 4].metric(label, f"{value:.1f} {unit}")


def render_measurement_charts(measurements: list[dict]) -> None:
    st.subheader("Trends")
    if not measurements:
        st.info("No time-series data available.")
        return

    frame = pd.DataFrame(measurements)
    frame["timestamp"] = pd.to_datetime(frame["timestamp"])
    frame = frame.sort_values("timestamp")

    pollutant_left, pollutant_right = st.columns([2, 1])
    with pollutant_left:
        selected_pollutants = st.multiselect(
            "Pollutants to display",
            options=POLLUTANT_COLUMNS,
            default=["pm25", "pm10", "o3", "temperature"],
        )
    with pollutant_right:
        chart_mode = st.selectbox("Chart mode", ["Line", "Area"], index=0)

    if selected_pollutants:
        melted = frame.melt(
            id_vars=["timestamp", "aqi_category", "location", "device_id"],
            value_vars=selected_pollutants,
            var_name="metric",
            value_name="value",
        )
        chart = (
            px.line(melted, x="timestamp", y="value", color="metric", markers=True)
            if chart_mode == "Line"
            else px.area(melted, x="timestamp", y="value", color="metric")
        )
        chart.update_layout(height=420, margin=dict(l=10, r=10, t=20, b=10))
        st.plotly_chart(chart, use_container_width=True)

    breakdown, scatter = st.columns(2)
    with breakdown:
        category_chart = px.histogram(
            frame,
            x="aqi_category",
            color="aqi_category",
            title="AQI category breakdown",
        )
        category_chart.update_layout(height=360, showlegend=False, margin=dict(l=10, r=10, t=40, b=10))
        st.plotly_chart(category_chart, use_container_width=True)
    with scatter:
        scatter_chart = px.scatter(
            frame,
            x="pm25",
            y="computed_index",
            color="aqi_category",
            size="humidity",
            hover_data=["timestamp", "device_id", "location"],
            title="AQI vs PM2.5",
        )
        scatter_chart.update_layout(height=360, margin=dict(l=10, r=10, t=40, b=10))
        st.plotly_chart(scatter_chart, use_container_width=True)

    st.subheader("Recent Measurements")
    table_frame = frame[["timestamp", "device_id", "location", "computed_index", "aqi_category", *POLLUTANT_COLUMNS]]
    st.dataframe(table_frame.sort_values("timestamp", ascending=False), use_container_width=True, hide_index=True)


def render_alerts(api_url: str, alerts: list[dict]) -> None:
    st.subheader("Alert Center")
    if not alerts:
        st.success("No alerts have been generated.")
        return

    for alert in alerts:
        severity = alert["severity"].upper()
        status = alert["status"].upper()
        with st.container(border=True):
            cols = st.columns([3, 2, 2, 1])
            cols[0].markdown(f"**{alert['title']}**")
            cols[1].write(f"{severity} | {status}")
            cols[2].write(format_dt(alert["updated_at"]))
            if alert["status"] == AlertStatus.OPEN.value:
                if cols[3].button("Acknowledge", key=f"ack-{alert['id']}"):
                    post_json(
                        f"{api_url}/api/v1/alerts/{alert['id']}/acknowledge",
                        json={"acknowledged_by": "Evelyn"},
                    )
                    st.rerun()
            else:
                cols[3].write(alert.get("acknowledged_by") or "-")
            st.write(alert["message"])
            st.caption(
                f"Observed: {alert['observed']:.1f} | Threshold: {alert['threshold']:.1f} | Pollutant: {alert['pollutant']}"
            )


def render_manual_ingestion(api_url: str) -> None:
    st.subheader("Manual Reading Input")
    with st.form("manual-reading"):
        cols = st.columns(4)
        device_id = cols[0].text_input("Device ID", value="demo-node-1")
        location = cols[1].text_input("Location", value="Indoor Lab")
        pm25 = cols[2].number_input("PM2.5", min_value=0.0, value=18.0, step=1.0)
        pm10 = cols[3].number_input("PM10", min_value=0.0, value=42.0, step=1.0)
        cols = st.columns(4)
        no2 = cols[0].number_input("NO2", min_value=0.0, value=12.0, step=1.0)
        so2 = cols[1].number_input("SO2", min_value=0.0, value=9.0, step=1.0)
        o3 = cols[2].number_input("O3", min_value=0.0, value=46.0, step=1.0)
        voc = cols[3].number_input("VOC", min_value=0.0, value=120.0, step=1.0)
        cols = st.columns(2)
        temperature = cols[0].number_input("Temperature", value=27.0, step=0.5)
        humidity = cols[1].number_input("Humidity", min_value=0.0, max_value=100.0, value=52.0, step=1.0)

        submitted = st.form_submit_button("Submit Reading")

    if submitted:
        payload = {
            "device_id": device_id,
            "location": location,
            "pm25": pm25,
            "pm10": pm10,
            "no2": no2,
            "so2": so2,
            "o3": o3,
            "voc": voc,
            "temperature": temperature,
            "humidity": humidity,
        }
        response = post_json(f"{api_url}/api/v1/measurements", json=payload)
        if response is not None:
            st.success(f"Reading stored with AQI {response['computed_index']} ({response['aqi_category']}).")
            st.rerun()


def get_json(url: str, params: dict[str, str] | None = None) -> dict | list | None:
    try:
        response = requests.get(url, params=params, timeout=8)
        response.raise_for_status()
        return response.json()
    except requests.RequestException:
        return None


def post_json(url: str, json: dict | None = None) -> dict | list | None:
    try:
        response = requests.post(url, json=json, timeout=12)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as exc:
        st.error(f"Request failed: {exc}")
        return None


def format_dt(value: str | None) -> str:
    if not value:
        return "N/A"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return value


def apply_theme() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background:
                radial-gradient(circle at top left, rgba(18, 92, 122, 0.18), transparent 28%),
                radial-gradient(circle at top right, rgba(217, 119, 6, 0.16), transparent 26%),
                linear-gradient(180deg, #f4efe7 0%, #f8fafc 100%);
        }
        .block-container {
            padding-top: 2rem;
            padding-bottom: 2rem;
        }
        h1, h2, h3 {
            letter-spacing: -0.03em;
        }
        .hero-card {
            padding: 1.4rem 1.5rem;
            border-radius: 24px;
            background: linear-gradient(135deg, #0f4c5c, #1f7a8c);
            color: #f8fafc;
            box-shadow: 0 18px 40px rgba(15, 76, 92, 0.18);
        }
        .hero-top {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: 0.8rem;
            font-size: 0.9rem;
        }
        .hero-badge {
            padding: 0.35rem 0.7rem;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.18);
        }
        .hero-time {
            opacity: 0.9;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
