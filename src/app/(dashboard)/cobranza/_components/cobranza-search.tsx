"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface Props {
  defaultSearch: string;
}

export function CobranzaSearch({ defaultSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultSearch);

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }
    router.push(`/cobranza?${params.toString()}`);
  }

  function handleClear() {
    setValue("");
    router.push("/cobranza");
  }

  return (
    <form onSubmit={handleSearch} className="flex items-center gap-2">
      <div className="relative flex-1 max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, apellido, DNI o CUIT..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-9"
        />
      </div>
      <Button type="submit" variant="default">
        Buscar
      </Button>
      {defaultSearch && (
        <Button type="button" variant="ghost" size="icon" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
