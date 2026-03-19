import { motion } from "framer-motion";
import { Clock, MapPin, Wind } from "lucide-react";
import type { Measurement } from "@/lib/api";
import { formatTimestamp, getAqiConfig } from "@/lib/aqi";

interface AQIHeroProps {
  measurement: Measurement | null;
  isLoading: boolean;
}

export function AQIHero({ measurement, isLoading }: AQIHeroProps) {
  if (isLoading) {
    return (
      <div className="gradient-hero rounded-2xl p-8 md:p-12 animate-pulse-gentle">
        <div className="flex flex-col items-center gap-4">
          <div className="h-24 w-24 rounded-full bg-muted" />
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!measurement) {
    return (
      <div className="gradient-hero rounded-2xl p-8 md:p-12 text-center">
        <Wind className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <h2 className="text-lg font-medium text-muted-foreground">No measurements yet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Use the <strong>Operations</strong> panel below to seed demo data or submit a manual reading.
        </p>
      </div>
    );
  }

  const config = getAqiConfig(measurement.aqi_category);
  const score = Math.round(measurement.computed_index);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="gradient-hero rounded-2xl p-8 md:p-12"
    >
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex flex-col items-center">
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center border-4"
            style={{ borderColor: config.color, backgroundColor: config.bg }}
          >
            <span className="text-4xl font-bold" style={{ color: config.color }}>
              {score}
            </span>
          </div>
          <span
            className="mt-3 text-sm font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: config.bg, color: config.color }}
          >
            {config.label}
          </span>
        </div>

        <div className="flex-1 text-center md:text-left space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Air Quality Index</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Wind className="h-4 w-4" />
              Dominant: <strong className="text-foreground">{measurement.dominant_pollutant?.toUpperCase() || "--"}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {measurement.location || measurement.device_id}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatTimestamp(measurement.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
