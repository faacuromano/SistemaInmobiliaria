"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold">Algo salio mal</h2>
        <p className="text-sm text-muted-foreground">
          Ocurrio un error inesperado. Intenta recargar la pagina o volver a intentar.
        </p>
        {error.message && (
          <p className="text-xs text-muted-foreground bg-muted rounded-md p-3 font-mono break-all">
            {error.message}
          </p>
        )}
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recargar pagina
          </Button>
          <Button onClick={reset}>
            Intentar de nuevo
          </Button>
        </div>
      </div>
    </div>
  );
}
