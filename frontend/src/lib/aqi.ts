export type AqiLevel =
  | "good"
  | "moderate"
  | "unhealthy-sensitive"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

export function getAqiLevel(category: string | null | undefined): AqiLevel {
  if (!category) {
    return "good";
  }

  const normalized = category.toLowerCase().replace(/\s+/g, "-").replace(/_/g, "-");
  if (normalized.includes("hazardous")) {
    return "hazardous";
  }
  if (normalized.includes("very") && normalized.includes("unhealthy")) {
    return "very-unhealthy";
  }
  if (normalized.includes("unhealthy") && normalized.includes("sensitive")) {
    return "unhealthy-sensitive";
  }
  if (normalized.includes("unhealthy")) {
    return "unhealthy";
  }
  if (normalized.includes("moderate")) {
    return "moderate";
  }
  return "good";
}

export const AQI_CONFIG: Record<
  AqiLevel,
  { label: string; color: string; bg: string; textClass: string; bgClass: string }
> = {
  good: {
    label: "Good",
    color: "hsl(152, 60%, 42%)",
    bg: "hsl(152, 60%, 95%)",
    textClass: "text-aqi-good",
    bgClass: "bg-aqi-good-bg",
  },
  moderate: {
    label: "Moderate",
    color: "hsl(45, 93%, 47%)",
    bg: "hsl(45, 93%, 95%)",
    textClass: "text-aqi-moderate",
    bgClass: "bg-aqi-moderate-bg",
  },
  "unhealthy-sensitive": {
    label: "Unhealthy for Sensitive Groups",
    color: "hsl(25, 95%, 53%)",
    bg: "hsl(25, 95%, 95%)",
    textClass: "text-aqi-unhealthy-sensitive",
    bgClass: "bg-aqi-unhealthy-sensitive-bg",
  },
  unhealthy: {
    label: "Unhealthy",
    color: "hsl(0, 72%, 51%)",
    bg: "hsl(0, 72%, 96%)",
    textClass: "text-aqi-unhealthy",
    bgClass: "bg-aqi-unhealthy-bg",
  },
  "very-unhealthy": {
    label: "Very Unhealthy",
    color: "hsl(300, 50%, 40%)",
    bg: "hsl(300, 50%, 96%)",
    textClass: "text-aqi-very-unhealthy",
    bgClass: "bg-aqi-very-unhealthy-bg",
  },
  hazardous: {
    label: "Hazardous",
    color: "hsl(350, 60%, 30%)",
    bg: "hsl(350, 60%, 96%)",
    textClass: "text-aqi-hazardous",
    bgClass: "bg-aqi-hazardous-bg",
  },
};

export function getAqiConfig(category: string | null | undefined) {
  return AQI_CONFIG[getAqiLevel(category)];
}

export function getSeverityColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "text-severity-critical";
    case "warning":
      return "text-severity-high";
    case "info":
      return "text-severity-low";
    default:
      return "text-muted-foreground";
  }
}

export function getSeverityBg(severity: string) {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "bg-destructive/10";
    case "warning":
      return "bg-aqi-unhealthy-sensitive-bg";
    case "info":
      return "bg-primary/5";
    default:
      return "bg-muted/40";
  }
}

export function formatTimestamp(ts: string | null | undefined) {
  if (!ts) {
    return "--";
  }

  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}
