"use client";

import { useEffect, useState } from "react";
import { DollarSign, Clock, ChevronDown, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { useCurrency } from "@/providers/currency-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ExchangeRates {
  officialBuy: number | null;
  officialSell: number | null;
  blueBuy: number | null;
  blueSell: number | null;
  cryptoBuy: number | null;
  cryptoSell: number | null;
}

interface Props {
  rates: ExchangeRates | null;
}

function fmt(value: number | null): string {
  if (value === null) return "-";
  return value.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function RateRow({
  label,
  buy,
  sell,
  highlight,
}: {
  label: string;
  buy: number | null;
  sell: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-3 py-1.5 rounded-sm text-sm ${
        highlight ? "bg-primary/5" : ""
      }`}
    >
      <span className={`font-medium ${highlight ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className="tabular-nums text-right flex items-center gap-1">
        <TrendingDown className="h-3 w-3 text-green-600" />
        <span className="w-14 text-right">{fmt(buy)}</span>
      </span>
      <span className="tabular-nums text-right flex items-center gap-1">
        <TrendingUp className="h-3 w-3 text-red-500" />
        <span className="w-14 text-right">{fmt(sell)}</span>
      </span>
    </div>
  );
}

export function HeaderInfo({ rates }: Props) {
  const { displayCurrency, toggleCurrency } = useCurrency();
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function updateTime() {
      setTime(
        new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    }

    updateTime();
    const interval = setInterval(updateTime, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  const displayRate = rates?.blueSell ?? null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground mr-1">
      <button
        onClick={toggleCurrency}
        className="glass-subtle flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors cursor-pointer outline-none hover:bg-primary/10 border-primary/20"
        title="Cambiar moneda de visualizacion"
      >
        <ArrowLeftRight className="h-3 w-3 text-primary" />
        <span className="font-semibold text-primary">
          {displayCurrency}
        </span>
      </button>
      {rates && displayRate !== null && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="glass-subtle flex items-center gap-1 rounded-full px-2.5 py-1 hover:bg-muted/40 transition-colors cursor-pointer outline-none">
              <DollarSign className="h-3 w-3 text-green-600" />
              <span className="font-medium text-foreground">
                {fmt(displayRate)}
              </span>
              <span className="hidden sm:inline">Blue</span>
              <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-0">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex items-center justify-between">
                <span>Cotizaciones del dia</span>
                <div className="flex gap-3 text-[10px] text-muted-foreground font-normal">
                  <span>Compra</span>
                  <span>Venta</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="py-1">
              <RateRow
                label="Dolar Blue"
                buy={rates.blueBuy}
                sell={rates.blueSell}
                highlight
              />
              <RateRow
                label="Dolar Oficial"
                buy={rates.officialBuy}
                sell={rates.officialSell}
              />
              <RateRow
                label="Dolar Crypto"
                buy={rates.cryptoBuy}
                sell={rates.cryptoSell}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div className="glass-subtle flex items-center gap-1 rounded-full px-2.5 py-1">
        <Clock className="h-3 w-3" />
        <span className="font-medium text-foreground tabular-nums">{time}</span>
      </div>
    </div>
  );
}
