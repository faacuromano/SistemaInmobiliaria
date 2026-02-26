"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { cancelSale } from "@/server/actions/sale.actions";
import { SaleStatus } from "@/types/enums";

interface SaleActionsProps {
  saleId: string;
  saleStatus: string;
}

export function SaleActions({ saleId, saleStatus }: SaleActionsProps) {
  const router = useRouter();

  if (saleStatus !== SaleStatus.ACTIVA) {
    return null;
  }

  async function handleCancelSale() {
    const result = await cancelSale(saleId);
    if (result.success) {
      toast.success("Venta cancelada exitosamente");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="font-medium">Acciones</p>
          <p className="text-sm text-muted-foreground">
            Operaciones disponibles para esta venta
          </p>
        </div>
        <ConfirmDialog
          title="Cancelar Venta"
          description="Esta accion cancelara la venta y devolvera el lote al estado disponible. Los pagos realizados no seran revertidos automaticamente. Esta accion no se puede deshacer."
          onConfirm={handleCancelSale}
          variant="destructive"
          trigger={
            <Button variant="destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Venta
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
