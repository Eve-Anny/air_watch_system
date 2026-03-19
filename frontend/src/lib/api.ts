export interface Measurement {
  id: string;
  device_id: string;
  location: string;
  timestamp: string;
  ingested_at: string;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  o3: number;
  voc: number | null;
  temperature: number;
  humidity: number;
  computed_index: number;
  aqi_category: string;
  dominant_pollutant: string;
  ratios: Record<string, number> | null;
  predicted_category: string | null;
  model_confidence: number | null;
  model_version: string | null;
}

export interface Alert {
  id: string;
  device_id: string;
  pollutant: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  threshold: number;
  observed: number;
  measurement_id: string;
  created_at: string;
  updated_at: string;
  acknowledged_by: string | null;
}

export interface SummaryStats {
  measurement_count: number;
  aqi_average: number | null;
  aqi_peak: number | null;
  category_breakdown: Record<string, number>;
  average_pollutants: Record<string, number>;
  latest_timestamp: string | null;
}

export interface ModelStatus {
  available: boolean;
  version: string | null;
  trained_at: string | null;
  training_samples: number;
}

export interface SummaryResponse {
  latest_measurement: Measurement | null;
  open_alerts: Alert[];
  model_status: ModelStatus;
  stats: SummaryStats;
}

export interface HealthResponse {
  status: string;
  storage: string;
}

export interface MeasurementInput {
  device_id: string;
  location: string;
  timestamp?: string;
  pm25: number;
  pm10: number;
  no2: number;
  so2: number;
  o3: number;
  voc?: number | null;
  temperature: number;
  humidity: number;
}

function buildQueryString(params?: Record<string, string | number | undefined | null>): string {
  if (!params) {
    return "";
  }

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim() !== "") {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

function resolveDefaultBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }

  if (window.location.port === "8080") {
    return "http://localhost:8000";
  }

  return window.location.origin.replace(/\/$/, "");
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, "");
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`API Error ${response.status}: ${text || response.statusText}`);
    }
    return response.json();
  }

  health() {
    return this.request<HealthResponse>("/health");
  }

  getSummary(params?: { device_id?: string }) {
    return this.request<SummaryResponse>(`/api/v1/summary${buildQueryString(params)}`);
  }

  getMeasurements(params?: { device_id?: string }) {
    return this.request<Measurement[]>(`/api/v1/measurements${buildQueryString(params)}`);
  }

  getLatestMeasurement(params?: { device_id?: string }) {
    return this.request<Measurement | null>(`/api/v1/measurements/latest${buildQueryString(params)}`);
  }

  postMeasurement(data: MeasurementInput) {
    return this.request<Measurement>("/api/v1/measurements", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  getAlerts(params?: { device_id?: string; status?: string }) {
    return this.request<Alert[]>(`/api/v1/alerts${buildQueryString(params)}`);
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    return this.request<Alert>(`/api/v1/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    });
  }

  seedData(count = 72) {
    return this.request<unknown>(`/api/v1/simulator/seed?count=${count}`, {
      method: "POST",
    });
  }

  trainModel() {
    return this.request<unknown>("/api/v1/models/train", {
      method: "POST",
    });
  }
}

export const apiClient = new ApiClient(resolveDefaultBaseUrl());
