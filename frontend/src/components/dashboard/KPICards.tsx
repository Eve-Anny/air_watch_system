                                                                                                                                import { motion } from "framer-motion";
import { Activity, AlertTriangle, BarChart3, Cpu, TrendingUp } from "lucide-react";
import type { SummaryResponse } from "@/lib/api";

interface KPICardsProps {
  summary: SummaryResponse | undefined;
  isLoading: boolean;
}

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card rounded-xl border border-border p-5 flex items-start gap-4 shadow-sm"
    >
      <div className="p-2.5 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export function KPICards({ summary, isLoading }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-card rounded-xl border border-border p-5 animate-pulse-gentle">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const stats = summary?.stats;
  const modelStatus = summary?.model_status;
  const modelAvailable = !!modelStatus?.available;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KPICard icon={BarChart3} label="Measurements" value={stats?.measurement_count ?? 0} delay={0} />
      <KPICard icon={Activity} label="Avg AQI" value={stats?.aqi_average?.toFixed(1) ?? "--"} delay={0.05} />
      <KPICard icon={TrendingUp} label="Peak AQI" value={stats?.aqi_peak?.toFixed(0) ?? "--"} delay={0.1} />
      <KPICard icon={AlertTriangle} label="Open Alerts" value={summary?.open_alerts?.length ?? 0} delay={0.15} />
      <KPICard
        icon={Cpu}
        label="ML Model"
        value={modelAvailable ? "Available" : "Not trained"}
        sub={modelAvailable ? modelStatus?.version ?? undefined : `${modelStatus?.training_samples ?? 0} samples`}
        delay={0.2}
      />
    </div>
  );
}
