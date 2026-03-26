"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LogOut, ChevronsUpDown, Settings } from "lucide-react";
import { type Role } from "@/types/enums";
import { navigation } from "@/lib/navigation";
import { logoutAction } from "@/server/actions/auth.actions";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <aside
      className={cn(
        "flex w-[260px] shrink-0 flex-col bg-gradient-to-b from-[#1E4463] to-[#172f45]",
        className
      )}
    >
      {/* ── Logo / Branding ────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pb-2 pt-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#31A9EB] shadow-lg shadow-[#31A9EB]/25">
          <Building2 className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold tracking-tight text-white">InmoSystem</p>
          <p className="-mt-0.5 text-[10px] font-medium text-white/35">Gestion Inmobiliaria</p>
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────── */}
      <div className="mx-5 my-3 h-px bg-white/8" />

      {/* ── Navigation ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-2 sidebar-nav-scroll">
        {navigation
          .filter((group) =>
            group.items.some((item) => hasAccess(item.permission))
          )
          .map((group, groupIndex) => (
            <div key={group.label} className={cn(groupIndex > 0 && "mt-5")}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">
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
                          "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium",
                          "transition-all duration-150 ease-out",
                          isActive
                            ? "bg-white/[0.12] text-white shadow-sm shadow-black/10"
                            : "text-white/55 hover:bg-white/[0.06] hover:text-white/90 hover:translate-x-[1px]"
                        )}
                      >
                        {/* Active indicator — glowing bar */}
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full transition-all duration-200",
                            isActive
                              ? "bg-[#31A9EB] opacity-100 shadow-[0_0_8px_rgba(49,169,235,0.6)]"
                              : "bg-[#31A9EB] opacity-0"
                          )}
                        />
                        <item.icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors duration-100",
                            isActive
                              ? "text-[#31A9EB]"
                              : "text-white/35 group-hover:text-white/70"
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

      {/* ── User section ───────────────────────────────── */}
      <div className="border-t border-white/8 px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                "transition-colors duration-150 hover:bg-white/[0.06]",
                "outline-none focus-visible:ring-1 focus-visible:ring-[#31A9EB]/50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  "bg-[#31A9EB]/15 ring-2 ring-[#31A9EB]/25",
                  "text-xs font-bold text-[#31A9EB]"
                )}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-[13px] font-medium text-white">
                  {userName}
                </p>
                <p className="text-[11px] text-white/35">{userRole}</p>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 text-white/25" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-56"
          >
            <DropdownMenuItem asChild>
              <Link href="/configuracion" onClick={onNavigate} className="gap-2">
                <Settings className="h-4 w-4" />
                Configuracion
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logoutAction} className="w-full">
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesion
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
