"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SearchInput } from "@/components/shared/search-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SIGNING_STATUS_LABELS } from "@/lib/constants";

interface Props {
  developments: Array<{ id: string; name: string }>;
}

export function SigningsFilters({ developments }: Props) {
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
        <SearchInput placeholder="Buscar por cliente o lote..." />
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
          {Object.entries(SIGNING_STATUS_LABELS).map(([key, label]) => (
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
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Desde</Label>
        <Input
          type="date"
          className="w-40"
          value={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => handleFilter("dateFrom", e.target.value)}
        />
      </div>
      <div className="space-y-1">
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
