import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api";
import { useDashboardSettings, POLLING_OPTIONS } from "@/contexts/DashboardContext";
import { toast } from "sonner";
import { Settings, Database, Cpu, RefreshCw, Filter, Pause, Play, User } from "lucide-react";

export function OperationsPanel() {
  const {
    baseUrl, setBaseUrl, deviceFilter, setDeviceFilter,
    pollingInterval, setPollingInterval, pollingPaused, setPollingPaused,
    acknowledgedBy, setAcknowledgedBy,
  } = useDashboardSettings();
  const [urlInput, setUrlInput] = useState(baseUrl);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [confirmTrain, setConfirmTrain] = useState(false);
  const queryClient = useQueryClient();

  const seedMutation = useMutation({
    mutationFn: () => apiClient.seedData(72),
    onSuccess: () => {
      toast.success("Demo data seeded (72 measurements)");
      queryClient.invalidateQueries();
      setConfirmSeed(false);
    },
    onError: (e: Error) => { toast.error(`Seed failed: ${e.message}`); setConfirmSeed(false); },
  });

  const trainMutation = useMutation({
    mutationFn: () => apiClient.trainModel(),
    onSuccess: () => {
      toast.success("ML model trained successfully");
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      setConfirmTrain(false);
    },
    onError: (e: Error) => { toast.error(`Training failed: ${e.message}`); setConfirmTrain(false); },
  });

  const handleUrlSave = () => {
    if (!urlInput.trim()) return;
    setBaseUrl(urlInput.trim());
    queryClient.invalidateQueries();
    toast.success("API base URL updated");
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    toast.info("Refreshing all data...");
  };

  const handleSeedClick = () => {
    if (confirmSeed) seedMutation.mutate();
    else setConfirmSeed(true);
  };

  const handleTrainClick = () => {
    if (confirmTrain) trainMutation.mutate();
    else setConfirmTrain(true);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-base font-semibold text-foreground">Operations</h3>
      </div>
      <div className="space-y-4">
        {/* API URL */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">API Base URL</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              className="h-9 text-sm font-mono"
              placeholder="http://localhost:8000"
            />
            <Button size="sm" variant="outline" onClick={handleUrlSave} className="shrink-0">
              Save
            </Button>
          </div>
        </div>

        {/* Device filter */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Device Filter</Label>
          <div className="relative mt-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={deviceFilter}
              onChange={e => setDeviceFilter(e.target.value)}
              className="h-9 text-sm pl-9"
              placeholder="All devices"
            />
          </div>
        </div>

        {/* Acknowledged By */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Acknowledged By</Label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={acknowledgedBy}
              onChange={e => setAcknowledgedBy(e.target.value)}
              className="h-9 text-sm pl-9"
              placeholder="Your name (optional)"
            />
          </div>
        </div>

        {/* Polling controls */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground">Auto-Refresh Interval</Label>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-0.5 bg-muted rounded-lg p-0.5 flex-1">
              {POLLING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPollingInterval(opt.value)}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    pollingInterval === opt.value && !pollingPaused
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant={pollingPaused ? "default" : "outline"}
              onClick={() => setPollingPaused(!pollingPaused)}
              className="gap-1.5 shrink-0"
            >
              {pollingPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {pollingPaused ? "Resume" : "Pause"}
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
          <Button size="sm" variant="outline" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant={confirmSeed ? "default" : "outline"}
            onClick={handleSeedClick}
            onBlur={() => setConfirmSeed(false)}
            disabled={seedMutation.isPending}
            className="gap-1.5"
          >
            <Database className="h-3.5 w-3.5" />
            {seedMutation.isPending ? "Seeding..." : confirmSeed ? "Confirm Seed?" : "Seed Demo Data"}
          </Button>
          <Button
            size="sm"
            variant={confirmTrain ? "default" : "outline"}
            onClick={handleTrainClick}
            onBlur={() => setConfirmTrain(false)}
            disabled={trainMutation.isPending}
            className="gap-1.5"
          >
            <Cpu className="h-3.5 w-3.5" />
            {trainMutation.isPending ? "Training..." : confirmTrain ? "Confirm Train?" : "Train ML Model"}
          </Button>
        </div>
      </div>
    </div>
  );
}
