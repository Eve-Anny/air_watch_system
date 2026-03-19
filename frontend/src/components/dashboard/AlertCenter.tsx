import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, Clock, Filter, Search, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Alert } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { formatTimestamp, getSeverityBg, getSeverityColor } from "@/lib/aqi";
import { useDashboardSettings } from "@/contexts/DashboardContext";
import { toast } from "sonner";

interface AlertCenterProps {
  alerts: Alert[] | undefined;
  isLoading: boolean;
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  open: AlertTriangle,
  acknowledged: CheckCircle,
  resolved: ShieldAlert,
};

const STATUS_OPTIONS = ["all", "open", "acknowledged", "resolved"] as const;
const SEVERITY_OPTIONS = ["all", "critical", "warning", "info"] as const;
const ALERTS_VIEWPORT_CLASS = "h-[90vh] sm:h-[98vh] overflow-y-auto pr-1 pb-1";

export function AlertCenter({ alerts, isLoading }: AlertCenterProps) {
  const queryClient = useQueryClient();
  const { acknowledgedBy } = useDashboardSettings();
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [confirmAck, setConfirmAck] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_OPTIONS[number]>("all");
  const [severityFilter, setSeverityFilter] = useState<typeof SEVERITY_OPTIONS[number]>("all");
  const [deviceSearch, setDeviceSearch] = useState("");

  const ackMutation = useMutation({
    mutationFn: (id: string) => apiClient.acknowledgeAlert(id, acknowledgedBy.trim() || "dashboard-operator"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      toast.success(
        "Alert acknowledged" + (acknowledgedBy.trim() ? ` by ${acknowledgedBy.trim()}` : ""),
      );
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => {
      setAcknowledging(null);
      setConfirmAck(null);
    },
  });

  const handleAckClick = (id: string) => {
    if (confirmAck === id) {
      setAcknowledging(id);
      ackMutation.mutate(id);
      return;
    }

    setConfirmAck(id);
  };

  const filtered = useMemo(() => {
    if (!alerts) {
      return [];
    }

    return alerts.filter((alert) => {
      if (statusFilter !== "all" && alert.status !== statusFilter) {
        return false;
      }

      if (severityFilter !== "all" && alert.severity?.toLowerCase() !== severityFilter) {
        return false;
      }

      if (deviceSearch) {
        const query = deviceSearch.toLowerCase();
        if (!alert.device_id?.toLowerCase().includes(query) && !alert.pollutant?.toLowerCase().includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [alerts, deviceSearch, severityFilter, statusFilter]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, Alert[]> = { open: [], acknowledged: [], resolved: [] };
    filtered.forEach((alert) => {
      const key = alert.status in groups ? alert.status : "open";
      groups[key].push(alert);
    });
    return groups;
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-pulse-gentle">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className={`${ALERTS_VIEWPORT_CLASS} space-y-3`}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 bg-muted/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalOpen = alerts?.filter((alert) => alert.status === "open").length ?? 0;
  const totalAcknowledged = alerts?.filter((alert) => alert.status === "acknowledged").length ?? 0;
  const totalResolved = alerts?.filter((alert) => alert.status === "resolved").length ?? 0;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Alert Center</h3>
        <div className="flex gap-1.5 text-xs">
          <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
            {totalOpen} open
          </span>
          <span className="px-2 py-0.5 rounded-full bg-aqi-moderate-bg text-aqi-moderate font-medium">
            {totalAcknowledged} ack
          </span>
          <span className="px-2 py-0.5 rounded-full bg-aqi-good-bg text-aqi-good font-medium">
            {totalResolved} resolved
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-border">
        <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                statusFilter === status
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
          {SEVERITY_OPTIONS.map((severity) => (
            <button
              key={severity}
              onClick={() => setSeverityFilter(severity)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                severityFilter === severity
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {severity}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={deviceSearch}
            onChange={(event) => setDeviceSearch(event.target.value)}
            placeholder="Device / pollutant..."
            className="h-8 text-xs pl-8"
          />
        </div>
      </div>

      {!alerts?.length ? (
        <div className={`text-center text-muted-foreground flex items-center justify-center ${ALERTS_VIEWPORT_CLASS}`}>
          <div>
            <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No alerts at this time</p>
            <p className="text-xs mt-1">Alerts will appear here when pollutant readings exceed thresholds.</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`text-center text-muted-foreground flex items-center justify-center ${ALERTS_VIEWPORT_CLASS}`}>
          <div>
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No alerts match the current filters.</p>
          </div>
        </div>
      ) : (
        <div className={`space-y-4 ${ALERTS_VIEWPORT_CLASS}`}>
          {(["open", "acknowledged", "resolved"] as const).map((status) => {
            const group = groupedByStatus[status];
            if (!group?.length) {
              return null;
            }

            return (
              <div key={status}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {status} ({group.length})
                </p>
                <div className="space-y-2">
                  {group.map((alert) => {
                    const Icon = STATUS_ICONS[alert.status] || XCircle;
                    const isOpen = alert.status === "open";
                    const isConfirming = confirmAck === alert.id;

                    return (
                      <div
                        key={alert.id}
                        className={`rounded-lg border p-4 transition-colors ${
                          isOpen ? `${getSeverityBg(alert.severity)} border-current/10` : "bg-muted/30 border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <Icon
                              className={`h-5 w-5 mt-0.5 shrink-0 ${
                                isOpen ? getSeverityColor(alert.severity) : "text-muted-foreground"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${isOpen ? "text-foreground" : "text-muted-foreground"}`}>
                                {alert.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{alert.message}</p>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="font-mono">{alert.pollutant?.toUpperCase()}</span>
                                <span>
                                  Observed: <strong>{alert.observed != null ? alert.observed.toFixed(1) : "--"}</strong>
                                  {" / "}Threshold: {alert.threshold ?? "--"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimestamp(alert.updated_at)}
                                </span>
                                <span className="font-mono text-xs">{alert.device_id}</span>
                                {alert.acknowledged_by && (
                                  <span>
                                    by: <strong>{alert.acknowledged_by}</strong>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isOpen && (
                            <Button
                              size="sm"
                              variant={isConfirming ? "default" : "outline"}
                              onClick={() => handleAckClick(alert.id)}
                              onBlur={() => {
                                if (isConfirming) {
                                  setConfirmAck(null);
                                }
                              }}
                              disabled={acknowledging === alert.id}
                              className="shrink-0 text-xs"
                            >
                              {acknowledging === alert.id ? "..." : isConfirming ? "Confirm?" : "Acknowledge"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
