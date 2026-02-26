import { format } from "date-fns";
import { es } from "date-fns/locale";
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function formatCurrency(
  amount: number | { toNumber(): number },
  currency: "USD" | "ARS"
): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  return currency === "USD"
    ? usdFormatter.format(value)
    : arsFormatter.format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy", { locale: es });
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}
