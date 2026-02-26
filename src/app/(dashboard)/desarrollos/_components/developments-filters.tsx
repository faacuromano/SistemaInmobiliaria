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
import { DEVELOPMENT_STATUS_LABELS, DEVELOPMENT_TYPE_LABELS } from "@/lib/constants";

export function DevelopmentsFilters() {
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
        <SearchInput placeholder="Buscar desarrollo..." />
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
          {Object.entries(DEVELOPMENT_STATUS_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => handleFilter("type", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          {Object.entries(DEVELOPMENT_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
