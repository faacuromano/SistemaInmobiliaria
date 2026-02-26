"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
}

export function SearchInput({
  placeholder = "Buscar...",
  paramName = "search",
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(paramName, value);
      } else {
        params.delete(paramName);
      }
      // Reset to page 1 when searching
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timeout);
  }, [value, paramName, pathname, router, searchParams]);

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
      />
    </div>
  );
}
