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
import { SALE_STATUS_LABELS } from "@/lib/constants";

interface Props {
  developments: Array<{ id: string; name: string }>;
}

export function SalesFilters({ developments }: Props) {
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
    <div className="flex flex-wrap items-center gap-4">
      <div className="w-64">
        <SearchInput placeholder="Buscar por comprador o lote..." />
      </div>
      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => handleFilter("status", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {Object.entries(SALE_STATUS_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
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
            <SelectItem key={dev.id} value={dev.id}>{dev.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
