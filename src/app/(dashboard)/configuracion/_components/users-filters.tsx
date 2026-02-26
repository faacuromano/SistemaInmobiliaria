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
import { ROLE_LABELS } from "@/lib/constants";

export function UsersFilters() {
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
        <SearchInput placeholder="Buscar por nombre o email..." />
      </div>
      <Select
        value={searchParams.get("role") ?? "all"}
        onValueChange={(v) => handleFilter("role", v)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Rol" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los roles</SelectItem>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
