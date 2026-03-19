import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpDown, Inbox, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Measurement } from "@/lib/api";
import { formatTimestamp, getAqiConfig } from "@/lib/aqi";
import { useMeasurementsPage } from "@/hooks/use-api";

interface MeasurementsTableProps {
  deviceFilter?: string;
}

type SortKey = "timestamp" | "computed_index" | "pm25" | "device_id";

const PAGE_SIZE = 8;

function formatValue(value: number | null | undefined, decimals = 1): string {
  return value != null ? value.toFixed(decimals) : "--";
}

export function MeasurementsTable({ deviceFilter }: MeasurementsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [deviceFilter]);

  const { data: measurements, isLoading, isFetching } = useMeasurementsPage(page, PAGE_SIZE);

  const filtered = useMemo(() => {
    if (!measurements) {
      return [];
    }

    let list = measurements;
    if (search) {
      const query = search.toLowerCase();
      list = list.filter(
        (measurement) =>
          measurement.device_id?.toLowerCase().includes(query) ||
          measurement.location?.toLowerCase().includes(query) ||
          measurement.aqi_category?.toLowerCase().includes(query),
      );
    }

    return [...list].sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      if (leftValue == null && rightValue == null) {
        return 0;
      }
      if (leftValue == null) {
        return 1;
      }
      if (rightValue == null) {
        return -1;
      }

      const comparison =
        typeof leftValue === "number"
          ? leftValue - (rightValue as number)
          : String(leftValue).localeCompare(String(rightValue));
      return sortAsc ? comparison : -comparison;
    });
  }, [measurements, search, sortAsc, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
      return;
    }

    setSortKey(key);
    setSortAsc(false);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-pulse-gentle">
        <div className="h-4 w-48 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 bg-muted/50 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const noData = !measurements?.length;
  const noResults = !!measurements?.length && filtered.length === 0;
  const hasNextPage = (measurements?.length ?? 0) === PAGE_SIZE;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-semibold text-foreground">Recent Measurements</h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search on this page..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {noData ? (
        <div className="text-center py-10 text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No measurements recorded</p>
          <p className="text-xs mt-1">
            {deviceFilter
              ? `No data found for device "${deviceFilter}". Try clearing the device filter.`
              : "Submit a manual reading or seed demo data to populate this table."}
          </p>
        </div>
      ) : noResults ? (
        <div className="text-center py-10 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No measurements on this page match "{search}"</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {(
                  [
                    ["timestamp", "Time"],
                    ["device_id", "Device"],
                    ["computed_index", "AQI"],
                    ["pm25", "PM2.5"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    className="text-left py-2 px-3 font-medium text-muted-foreground cursor-pointer select-none"
                    onClick={() => toggleSort(key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                ))}
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">PM10</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((measurement: Measurement) => {
                const config = getAqiConfig(measurement.aqi_category);
                return (
                  <tr key={measurement.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs">{formatTimestamp(measurement.timestamp)}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{measurement.device_id ?? "--"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`font-semibold ${config.textClass}`}>
                        {measurement.computed_index != null ? Math.round(measurement.computed_index) : "--"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{formatValue(measurement.pm25)}</td>
                    <td className="py-2.5 px-3">{formatValue(measurement.pm10)}</td>
                    <td className="py-2.5 px-3">
                      {measurement.aqi_category ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.textClass} ${config.bgClass}`}>
                          {measurement.aqi_category}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{measurement.location || "--"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Page {page + 1} | {PAGE_SIZE} rows per page
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
            disabled={page === 0 || isFetching}
            className="gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => current + 1)}
            disabled={!hasNextPage || isFetching}
            className="gap-1.5"
          >
            Next
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
