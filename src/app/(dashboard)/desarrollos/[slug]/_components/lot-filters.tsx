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
import { LOT_STATUS_LABELS } from "@/lib/constants";

export function LotFilters() {
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
      <div className="w-48">
        <SearchInput placeholder="Buscar lote..." paramName="lotSearch" />
      </div>
      <Select
        value={searchParams.get("lotStatus") ?? "all"}
        onValueChange={(v) => handleFilter("lotStatus", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          {Object.entries(LOT_STATUS_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
