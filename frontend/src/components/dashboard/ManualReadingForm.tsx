import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, type MeasurementInput } from "@/lib/api";
import { toast } from "sonner";

const FIELDS: readonly { key: string; label: string; type: string; required?: boolean }[] = [
  { key: "device_id", label: "Device ID", type: "text", required: true },
  { key: "location", label: "Location", type: "text", required: true },
  { key: "pm25", label: "PM2.5 (ug/m3)", type: "number", required: true },
  { key: "pm10", label: "PM10 (ug/m3)", type: "number", required: true },
  { key: "no2", label: "NO2 (ug/m3)", type: "number", required: true },
  { key: "so2", label: "SO2 (ug/m3)", type: "number", required: true },
  { key: "o3", label: "O3 (ug/m3)", type: "number", required: true },
  { key: "voc", label: "VOC (ppb)", type: "number" },
  { key: "temperature", label: "Temperature (C)", type: "number", required: true },
  { key: "humidity", label: "Humidity (%)", type: "number", required: true },
];

const REQUIRED_NUMERIC_FIELDS = ["pm25", "pm10", "no2", "so2", "o3", "temperature", "humidity"] as const;

const defaultValues: Record<string, string> = {
  device_id: "demo-node-1",
  location: "Indoor Lab",
  pm25: "18.0",
  pm10: "42.0",
  no2: "12.0",
  so2: "9.0",
  o3: "46.0",
  voc: "120.0",
  temperature: "27.0",
  humidity: "52.0",
};

export function ManualReadingForm() {
  const [values, setValues] = useState({ ...defaultValues });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: MeasurementInput) => apiClient.postMeasurement(data),
    onSuccess: () => {
      toast.success("Reading submitted successfully");
      setValues({ ...defaultValues });
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (error: Error) => toast.error(`Submission failed: ${error.message}`),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!values.device_id.trim() || !values.location.trim()) {
      toast.error("Device ID and Location are required");
      return;
    }

    const data: MeasurementInput = {
      device_id: values.device_id.trim(),
      location: values.location.trim(),
      pm25: 0,
      pm10: 0,
      no2: 0,
      so2: 0,
      o3: 0,
      temperature: 0,
      humidity: 0,
    };

    for (const key of REQUIRED_NUMERIC_FIELDS) {
      const rawValue = values[key].trim();
      if (!rawValue) {
        toast.error(`Please provide ${key.toUpperCase()}`);
        return;
      }

      const parsedValue = parseFloat(rawValue);
      if (Number.isNaN(parsedValue)) {
        toast.error(`Invalid value for ${key.toUpperCase()}`);
        return;
      }

      data[key] = parsedValue;
    }

    if (values.voc.trim()) {
      const parsedVoc = parseFloat(values.voc);
      if (Number.isNaN(parsedVoc)) {
        toast.error("Invalid value for VOC");
        return;
      }
      data.voc = parsedVoc;
    }

    mutation.mutate(data);
  };

  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-base font-semibold text-foreground mb-4">Submit Manual Reading</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key} className="text-xs font-medium text-muted-foreground">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Input
                id={field.key}
                type={field.type}
                step={field.type === "number" ? "0.1" : undefined}
                value={values[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                className="mt-1 h-9 text-sm"
                placeholder={field.required ? `${field.label} *` : field.label}
              />
            </div>
          ))}
        </div>
        <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto gap-2">
          <Send className="h-4 w-4" />
          {mutation.isPending ? "Submitting..." : "Submit Reading"}
        </Button>
      </form>
    </div>
  );
}
