"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Price } from "@/components/shared/price";

interface SummaryCardsProps {
  summary: {
    arsIncome: number;
    arsExpense: number;
    usdIncome: number;
    usdExpense: number;
  };
  exchangeRate: {
    blueSell: number | null;
    blueBuy: number | null;
  } | null;
}

export function SummaryCards({ summary, exchangeRate }: SummaryCardsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos USD</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            <Price amount={summary.usdIncome} currency="USD" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Egresos USD</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            <Price amount={summary.usdExpense} currency="USD" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos ARS</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            <Price amount={summary.arsIncome} currency="ARS" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Egresos ARS</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            <Price amount={summary.arsExpense} currency="ARS" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Cotizacion Dolar Blue
          </CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {exchangeRate?.blueSell
              ? <Price amount={exchangeRate.blueSell} currency="ARS" />
              : "No disponible"}
          </div>
          {exchangeRate?.blueBuy && (
            <p className="text-xs text-muted-foreground">
              Compra: <Price amount={exchangeRate.blueBuy} currency="ARS" />
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
