import { motion } from "framer-motion";
import { AlertCircle, Brain, ShieldCheck, TrendingUp } from "lucide-react";
import type { Measurement, SummaryResponse } from "@/lib/api";
import { formatTimestamp, getAqiConfig } from "@/lib/aqi";

interface MLInsightsProps {
  latestMeasurement: Measurement | null;
  summary: SummaryResponse | undefined;
  isLoading: boolean;
}

export function MLInsights({ latestMeasurement, summary, isLoading }: MLInsightsProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-pulse-gentle">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-muted/50 rounded" />
          <div className="h-16 bg-muted/50 rounded" />
        </div>
      </div>
    );
  }

  const modelStatus = summary?.model_status;
  const hasModel = !!modelStatus?.available;
  const hasPrediction = !!latestMeasurement?.predicted_category;

  if (!hasModel && !hasPrediction) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">ML Insights</h3>
        </div>
        <div className="text-center py-6">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground font-medium">Model Not Trained</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use the Operations panel to train the ML model. It requires existing measurement data.
          </p>
        </div>
      </div>
    );
  }

  const predictionConfig = hasPrediction ? getAqiConfig(latestMeasurement?.predicted_category) : null;
  const confidence = latestMeasurement?.model_confidence;
  const confidencePct = confidence != null ? Math.round(confidence * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-primary" />
        <h3 className="text-base font-semibold text-foreground">ML Insights</h3>
      </div>

      <div className="space-y-4">
        {hasModel && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <ShieldCheck className="h-5 w-5 text-aqi-good mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Model Available</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                {modelStatus?.version && (
                  <span>
                    Version: <strong className="text-foreground font-mono">{modelStatus.version}</strong>
                  </span>
                )}
                <span>
                  Samples: <strong className="text-foreground">{modelStatus?.training_samples ?? 0}</strong>
                </span>
                {modelStatus?.trained_at && (
                  <span>
                    Trained: <strong className="text-foreground">{formatTimestamp(modelStatus.trained_at)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {hasPrediction && predictionConfig && latestMeasurement && (
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: predictionConfig.bg }}>
            <TrendingUp className="h-5 w-5 mt-0.5 shrink-0" style={{ color: predictionConfig.color }} />
            <div className="text-sm">
              <p className="font-medium text-foreground">
                Predicted: <span style={{ color: predictionConfig.color }}>{latestMeasurement.predicted_category}</span>
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                {confidencePct != null && (
                  <span className="flex items-center gap-1.5">
                    Confidence:
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <span
                          className="block h-full rounded-full transition-all"
                          style={{ width: `${confidencePct}%`, backgroundColor: predictionConfig.color }}
                        />
                      </span>
                      <strong className="text-foreground">{confidencePct}%</strong>
                    </span>
                  </span>
                )}
                {latestMeasurement.model_version && (
                  <span>
                    Model: <strong className="font-mono text-foreground">{latestMeasurement.model_version}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
