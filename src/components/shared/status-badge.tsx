import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  label: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function StatusBadge({ label, variant = "default" }: StatusBadgeProps) {
  return <Badge variant={variant}>{label}</Badge>;
}
