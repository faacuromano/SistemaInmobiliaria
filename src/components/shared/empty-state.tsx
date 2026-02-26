import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border/50 bg-card/50 p-8 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
