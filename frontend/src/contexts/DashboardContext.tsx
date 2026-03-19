import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { apiClient } from "@/lib/api";

export const POLLING_OPTIONS = [
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
  { label: "30s", value: 30000 },
  { label: "60s", value: 60000 },
] as const;

interface DashboardSettings {
  baseUrl: string;
  deviceFilter: string;
  pollingInterval: number;
  pollingPaused: boolean;
  acknowledgedBy: string;
  setBaseUrl: (url: string) => void;
  setDeviceFilter: (id: string) => void;
  setPollingInterval: (ms: number) => void;
  setPollingPaused: (paused: boolean) => void;
  setAcknowledgedBy: (name: string) => void;
}

const DashboardContext = createContext<DashboardSettings>({
  baseUrl: apiClient.getBaseUrl(),
  deviceFilter: "",
  pollingInterval: 10000,
  pollingPaused: false,
  acknowledgedBy: "dashboard-operator",
  setBaseUrl: () => {},
  setDeviceFilter: () => {},
  setPollingInterval: () => {},
  setPollingPaused: () => {},
  setAcknowledgedBy: () => {},
});

export const useDashboardSettings = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [baseUrl, _setBaseUrl] = useState(apiClient.getBaseUrl());
  const [deviceFilter, setDeviceFilter] = useState("");
  const [pollingInterval, setPollingInterval] = useState(10000);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [acknowledgedBy, setAcknowledgedBy] = useState("dashboard-operator");

  const setBaseUrl = useCallback((url: string) => {
    apiClient.setBaseUrl(url);
    _setBaseUrl(url);
  }, []);

  return (
    <DashboardContext.Provider value={{
      baseUrl, deviceFilter, pollingInterval, pollingPaused, acknowledgedBy,
      setBaseUrl, setDeviceFilter, setPollingInterval, setPollingPaused, setAcknowledgedBy,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};
