import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { Measurement, SummaryStats } from "@/lib/api";

const POLLUTANT_COLORS: Record<string, string> = {
  pm25: "hsl(199, 89%, 38%)",
  pm10: "hsl(172, 55%, 40%)",
  no2: "hsl(45, 93%, 47%)",
  so2: "hsl(25, 95%, 53%)",
  o3: "hsl(300, 50%, 40%)",
  voc: "hsl(152, 60%, 42%)",
};

const AQI_PIE_COLORS: Record<string, string> = {
  good: "hsl(152, 60%, 42%)",
  moderate: "hsl(45, 93%, 47%)",
  unhealthy: "hsl(0, 72%, 51%)",
  hazardous: "hsl(350, 60%, 30%)",
};

interface TrendsProps {
  measurements: Measurement[] | undefined;
  stats: SummaryStats | undefined;
  isLoading: boolean;
}

export function TrendsCharts({ measurements, stats, isLoading }: TrendsProps) {
  const [chartType, setChartType] = useState<"line" | "area">("area");

  const trendData = useMemo(() => {
    if (!measurements?.length) {
      return [];
    }

    return [...measurements]
      .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime())
      .map((measurement) => ({
        time: new Date(measurement.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
        pm25: measurement.pm25,
        pm10: measurement.pm10,
        no2: measurement.no2,
        so2: measurement.so2,
        o3: measurement.o3,
        voc: measurement.voc,
        aqi: measurement.computed_index,
      }));
  }, [measurements]);

  const pieData = useMemo(() => {
    if (!stats?.category_breakdown) {
      return [];
    }

    return Object.entries(stats.category_breakdown).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const scatterData = useMemo(() => {
    if (!measurements?.length) {
      return [];
    }

    return measurements.map((measurement) => ({
      pm25: measurement.pm25,
      aqi: measurement.computed_index,
      name: measurement.device_id,
    }));
  }, [measurements]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className={`bg-card rounded-xl border border-border p-6 animate-pulse-gentle ${
              item === 1 ? "lg:col-span-2" : ""
            }`}
          >
            <div className="h-4 w-40 bg-muted rounded mb-4" />
            <div className="h-64 bg-muted/50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!measurements?.length) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
        No trend data available. Submit measurements or seed demo data.
      </div>
    );
  }

  const Chart = chartType === "area" ? AreaChart : LineChart;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Pollutant Trends</h3>
          <div className="flex gap-1 bg-muted rounded-lg p-0.5">
            {(["area", "line"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  chartType === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <Chart data={trendData}>
            {chartType === "area" && (
              <defs>
                {Object.entries(POLLUTANT_COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`area-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.55} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.08} />
                  </linearGradient>
                ))}
              </defs>
            )}
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 50%)" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 50%)" />
            <Tooltip
              contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(214,20%,90%)", fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {Object.entries(POLLUTANT_COLORS).map(([key, color]) =>
              chartType === "area" ? (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  fill={`url(#area-${key})`}
                  fillOpacity={1}
                  strokeWidth={1.2}
                  dot={false}
                  activeDot={false}
                />
              ) : (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ),
            )}
          </Chart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">AQI Category Breakdown</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={3}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={AQI_PIE_COLORS[entry.name.toLowerCase()] || "hsl(215, 14%, 50%)"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-12">No breakdown data</p>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">AQI vs PM2.5</h3>
        <ResponsiveContainer width="100%" height={260}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis dataKey="pm25" name="PM2.5" unit="ug/m3" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 50%)" />
            <YAxis dataKey="aqi" name="AQI" tick={{ fontSize: 11 }} stroke="hsl(215, 14%, 50%)" />
            <ZAxis range={[30, 30]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ borderRadius: "0.5rem", fontSize: 12 }} />
            <Scatter data={scatterData} fill="hsl(199, 89%, 38%)" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
