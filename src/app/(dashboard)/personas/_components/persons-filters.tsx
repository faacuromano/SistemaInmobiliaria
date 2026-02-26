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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PERSON_TYPE_LABELS } from "@/lib/constants";

export function PersonsFilters() {
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

  function handleInactiveToggle(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set("inactive", "true");
    } else {
      params.delete("inactive");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="w-64">
        <SearchInput placeholder="Buscar por nombre, DNI, CUIT..." />
      </div>
      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => handleFilter("type", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          {Object.entries(PERSON_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Switch
          id="show-inactive"
          checked={searchParams.get("inactive") === "true"}
          onCheckedChange={handleInactiveToggle}
        />
        <Label htmlFor="show-inactive" className="text-sm">Mostrar inactivos</Label>
      </div>
    </div>
  );
}
