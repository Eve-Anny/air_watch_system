import { DashboardProvider, useDashboardSettings, POLLING_OPTIONS } from "@/contexts/DashboardContext";
import { useSummary, useMeasurements, useAlerts, useHealth } from "@/hooks/use-api";
import { AQIHero } from "@/components/dashboard/AQIHero";
import { KPICards } from "@/components/dashboard/KPICards";
import { TrendsCharts } from "@/components/dashboard/TrendsCharts";
import { MeasurementsTable } from "@/components/dashboard/MeasurementsTable";
import { AlertCenter } from "@/components/dashboard/AlertCenter";
import { ManualReadingForm } from "@/components/dashboard/ManualReadingForm";
import { OperationsPanel } from "@/components/dashboard/OperationsPanel";
import { ConnectionError } from "@/components/dashboard/ConnectionError";
import { MLInsights } from "@/components/dashboard/MLInsights";
import { Wind, Pause, Play } from "lucide-react";

function DashboardContent() {
  const health = useHealth();
  const summary = useSummary();
  const measurements = useMeasurements();
  const alerts = useAlerts();
  const { pollingPaused, setPollingPaused, pollingInterval, deviceFilter } = useDashboardSettings();

  const isOffline = health.isError;
  const isLoading = summary.isLoading || measurements.isLoading;

  const intervalLabel = POLLING_OPTIONS.find(o => o.value === pollingInterval)?.label ?? `${pollingInterval / 1000}s`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg gradient-sky">
              <Wind className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-sm tracking-tight">AirWatch</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Polling indicator */}
            <button
              onClick={() => setPollingPaused(!pollingPaused)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title={pollingPaused ? "Resume auto-refresh" : "Pause auto-refresh"}
            >
              {pollingPaused ? (
                <>
                  <Pause className="h-3 w-3" />
                  <span>Paused</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" />
                  <span>Every {intervalLabel}</span>
                </>
              )}
            </button>
            <div className="h-4 w-px bg-border" />
            {/* Connection status */}
            {!isOffline ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-aqi-good animate-pulse-gentle" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-destructive">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                Offline
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {isOffline && <ConnectionError error={health.error as Error} />}

        {/* Hero + KPIs */}
        <section className="space-y-6">
          <AQIHero
            measurement={summary.data?.latest_measurement ?? null}
            isLoading={isLoading}
          />
          <KPICards summary={summary.data} isLoading={isLoading} />
        </section>

        {/* ML Insights */}
        <section>
          <MLInsights
            latestMeasurement={summary.data?.latest_measurement ?? null}
            summary={summary.data}
            isLoading={isLoading}
          />
        </section>

        {/* Trends */}
        <section>
          <TrendsCharts
            measurements={measurements.data}
            stats={summary.data?.stats}
            isLoading={measurements.isLoading}
          />
        </section>

        {/* Measurements Table */}
        <section>
          <MeasurementsTable deviceFilter={deviceFilter} />
        </section>

        {/* Alerts + Forms */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AlertCenter alerts={alerts.data} isLoading={alerts.isLoading} />
          <div className="space-y-6">
            <ManualReadingForm />
            <OperationsPanel />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-muted-foreground text-center">
            AirWatch Environmental Monitoring Dashboard
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Index() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
