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
import { MOVEMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";

interface Props {
  developments: Array<{ id: string; name: string }>;
  bankAccounts: Array<{ id: string; name: string }>;
}

export function CajaFilters({ developments, bankAccounts }: Props) {
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
        <SearchInput placeholder="Buscar por concepto..." />
      </div>
      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => handleFilter("type", v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          {Object.entries(MOVEMENT_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("developmentId") ?? "all"}
        onValueChange={(v) => handleFilter("developmentId", v)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Desarrollo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los desarrollos</SelectItem>
          {developments.map((dev) => (
            <SelectItem key={dev.id} value={dev.id}>
              {dev.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("paymentMethod") ?? "all"}
        onValueChange={(v) => handleFilter("paymentMethod", v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Método de pago" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los métodos</SelectItem>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("bankAccountId") ?? "all"}
        onValueChange={(v) => handleFilter("bankAccountId", v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Cuenta bancaria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las cuentas</SelectItem>
          {bankAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
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
