"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  developments: Array<{ id: string; name: string }>;
  availableYears: number[];
}

export function PeriodFilters({ developments, availableYears }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentYear = new Date().getFullYear();

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
      <Select
        value={searchParams.get("year") ?? String(currentYear)}
        onValueChange={(v) => handleFilter("year", v)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("developmentId") ?? "all"}
        onValueChange={(v) => handleFilter("developmentId", v)}
      >
        <SelectTrigger className="w-52">
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
    </div>
  );
}
