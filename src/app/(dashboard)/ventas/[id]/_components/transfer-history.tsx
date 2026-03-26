"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowRightLeft, Calendar, User } from "lucide-react";
import { getTransferHistory } from "@/server/actions/sale-transfer.actions";

interface TransferRecord {
  id: string;
  fromPerson: { firstName: string; lastName: string };
  toPerson: { firstName: string; lastName: string };
  transferDate: string;
  renegotiated: boolean;
  notes: string | null;
  createdBy: { name: string };
  createdAt: string;
}

interface Props {
  saleId: string;
}

export function TransferHistory({ saleId }: Props) {
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransferHistory(saleId)
      .then((data) => setTransfers(data as TransferRecord[]))
      .catch(() => setTransfers([]))
      .finally(() => setLoading(false));
  }, [saleId]);

  if (loading) return null;
  if (transfers.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Historial de Transferencias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <div
              key={transfer.id}
              className="rounded-md border p-4 space-y-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">
                    {transfer.fromPerson.firstName}{" "}
                    {transfer.fromPerson.lastName}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">
                    {transfer.toPerson.firstName}{" "}
                    {transfer.toPerson.lastName}
                  </span>
                </div>
                {transfer.renegotiated && (
                  <Badge variant="secondary">Cuotas renegociadas</Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(transfer.transferDate).toLocaleDateString("es-AR")}
                </span>
                <span>
                  Registrado por: {transfer.createdBy.name}
                </span>
              </div>

              {transfer.notes && (
                <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                  {transfer.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
