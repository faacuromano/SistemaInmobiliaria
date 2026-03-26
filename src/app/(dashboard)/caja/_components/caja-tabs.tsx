"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Receipt, BarChart3 } from "lucide-react";

interface CajaTabsProps {
  libroContent: React.ReactNode;
  movimientosContent: React.ReactNode;
  balancesContent: React.ReactNode;
}

export function CajaTabs({
  libroContent,
  movimientosContent,
  balancesContent,
}: CajaTabsProps) {
  return (
    <Tabs defaultValue="libro">
      <TabsList>
        <TabsTrigger value="libro">
          <BookOpen className="mr-1.5 h-4 w-4" />
          Libro de Caja
        </TabsTrigger>
        <TabsTrigger value="movimientos">
          <Receipt className="mr-1.5 h-4 w-4" />
          Movimientos
        </TabsTrigger>
        <TabsTrigger value="balances">
          <BarChart3 className="mr-1.5 h-4 w-4" />
          Balances Mensuales
        </TabsTrigger>
      </TabsList>
      <TabsContent value="libro">{libroContent}</TabsContent>
      <TabsContent value="movimientos">{movimientosContent}</TabsContent>
      <TabsContent value="balances">{balancesContent}</TabsContent>
    </Tabs>
  );
}
