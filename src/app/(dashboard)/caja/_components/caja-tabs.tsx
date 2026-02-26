"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, BarChart3 } from "lucide-react";

interface CajaTabsProps {
  movimientosContent: React.ReactNode;
  balancesContent: React.ReactNode;
}

export function CajaTabs({
  movimientosContent,
  balancesContent,
}: CajaTabsProps) {
  return (
    <Tabs defaultValue="movimientos">
      <TabsList>
        <TabsTrigger value="movimientos">
          <Receipt className="mr-1.5 h-4 w-4" />
          Movimientos
        </TabsTrigger>
        <TabsTrigger value="balances">
          <BarChart3 className="mr-1.5 h-4 w-4" />
          Balances Mensuales
        </TabsTrigger>
      </TabsList>
      <TabsContent value="movimientos">{movimientosContent}</TabsContent>
      <TabsContent value="balances">{balancesContent}</TabsContent>
    </Tabs>
  );
}
