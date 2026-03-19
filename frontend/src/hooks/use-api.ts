import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useDashboardSettings } from "@/contexts/DashboardContext";

export function useSummary() {
  const { baseUrl, deviceFilter, pollingInterval, pollingPaused } = useDashboardSettings();
  return useQuery({
    queryKey: ["summary", baseUrl, deviceFilter],
    queryFn: () => apiClient.getSummary(deviceFilter ? { device_id: deviceFilter } : undefined),
    refetchInterval: pollingPaused ? false : pollingInterval,
    retry: 1,
  });
}

export function useMeasurements() {
  const { baseUrl, deviceFilter, pollingInterval, pollingPaused } = useDashboardSettings();
  return useQuery({
    queryKey: ["measurements", baseUrl, deviceFilter],
    queryFn: () =>
      apiClient.getMeasurements(deviceFilter ? { device_id: deviceFilter, limit: 240, offset: 0 } : { limit: 240, offset: 0 }),
    refetchInterval: pollingPaused ? false : pollingInterval,
    retry: 1,
  });
}

export function useMeasurementsPage(page: number, pageSize: number) {
  const { baseUrl, deviceFilter, pollingInterval, pollingPaused } = useDashboardSettings();
  const offset = Math.max(page, 0) * pageSize;
  return useQuery({
    queryKey: ["measurements-page", baseUrl, deviceFilter, page, pageSize],
    queryFn: () =>
      apiClient.getMeasurements(
        deviceFilter ? { device_id: deviceFilter, limit: pageSize, offset } : { limit: pageSize, offset },
      ),
    refetchInterval: pollingPaused ? false : pollingInterval,
    retry: 1,
  });
}

export function useAlerts() {
  const { baseUrl, deviceFilter, pollingInterval, pollingPaused } = useDashboardSettings();
  return useQuery({
    queryKey: ["alerts", baseUrl, deviceFilter],
    queryFn: () => apiClient.getAlerts(deviceFilter ? { device_id: deviceFilter } : undefined),
    refetchInterval: pollingPaused ? false : Math.max(pollingInterval / 2, 5000),
    retry: 1,
  });
}

export function useHealth() {
  const { baseUrl, pollingInterval, pollingPaused } = useDashboardSettings();
  return useQuery({
    queryKey: ["health", baseUrl],
    queryFn: () => apiClient.health(),
    refetchInterval: pollingPaused ? false : pollingInterval,
    retry: 1,
  });
}
