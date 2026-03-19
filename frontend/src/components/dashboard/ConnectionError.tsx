import { WifiOff } from "lucide-react";

export function ConnectionError({ error }: { error: Error | null }) {
  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 text-center">
      <WifiOff className="h-10 w-10 mx-auto mb-3 text-destructive/60" />
      <h3 className="text-base font-semibold text-foreground mb-1">Backend Unreachable</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Could not connect to the API server. Check that your backend is running and the API URL is correct.
      </p>
      {error && (
        <p className="text-xs font-mono text-destructive/70 mt-3 break-all">{error.message}</p>
      )}
    </div>
  );
}
