"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SearchInput } from "@/components/shared/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ENTITY_OPTIONS = [
  { value: "Sale", label: "Ventas" },
  { value: "Lot", label: "Lotes" },
  { value: "Person", label: "Personas" },
  { value: "Development", label: "Desarrollos" },
  { value: "CashMovement", label: "Movimientos de Caja" },
  { value: "User", label: "Usuarios" },
  { value: "Installment", label: "Cuotas" },
  { value: "ExtraCharge", label: "Refuerzos" },
  { value: "SigningSlot", label: "Firmas" },
  { value: "ExchangeRate", label: "Cotizaciones" },
] as const;

export function AuditFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-64">
        <SearchInput placeholder="Buscar por entidad, ID o accion..." />
      </div>
      <Select
        value={searchParams.get("entity") ?? "all"}
        onValueChange={(v) => handleFilter("entity", v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Entidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las entidades</SelectItem>
          {ENTITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Desde</Label>
        <Input
          type="date"
          className="w-40"
          value={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => handleFilter("dateFrom", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Hasta</Label>
        <Input
          type="date"
          className="w-40"
          value={searchParams.get("dateTo") ?? ""}
          onChange={(e) => handleFilter("dateTo", e.target.value)}
        />
      </div>
    </div>
  );
}
