"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut } from "lucide-react";
import { type Role } from "@/types/enums";
import { navigation } from "@/lib/navigation";
import { logoutAction } from "@/server/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SidebarProps = {
  userRole: Role;
  userName: string;
  permissions: string[];
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ userRole, userName, permissions, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const hasAccess = (permission?: string) =>
    !permission ||
    permissions.includes(permission) ||
    permissions.includes("*");

  return (
    <aside className={cn("flex w-60 shrink-0 flex-col border-r bg-sidebar", className)}>
      {/* ── App branding ──────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <p className="text-[15px] font-bold tracking-tight">Sistema Inmobiliaria</p>
      </div>

      {/* ── Navigation groups ─────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navigation
          .filter((group) =>
            group.items.some((item) => hasAccess(item.permission))
          )
          .map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-5")}>
              <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items
                  .filter((item) => hasAccess(item.permission))
                  .map((item) => {
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors duration-75",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground/65 hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {/* Active indicator bar */}
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-opacity duration-150",
                            isActive ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
      </nav>

      {/* ── User section ──────────────────────────────── */}
      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{userName}</p>
            <p className="text-[11px] text-muted-foreground">{userRole}</p>
          </div>
        </div>
        <form action={logoutAction} className="mt-1 px-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-full justify-start gap-3 rounded-lg px-3 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesion
          </Button>
        </form>
      </div>
    </aside>
  );
}
