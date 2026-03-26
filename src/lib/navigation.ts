import {
  LayoutDashboard,
  Building2,
  Users,
  Receipt,
  Wallet,
  CalendarCheck,
  Settings,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import { type Permission } from "./rbac";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    label: "General",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard:view",
      },
      {
        label: "Estadisticas",
        href: "/estadisticas",
        icon: BarChart3,
        permission: "dashboard:view",
      },
    ],
  },
  {
    label: "Inmobiliaria",
    items: [
      {
        label: "Desarrollos",
        href: "/desarrollos",
        icon: Building2,
        permission: "developments:view",
      },
      {
        label: "Personas",
        href: "/personas",
        icon: Users,
        permission: "persons:view",
      },
      {
        label: "Ventas",
        href: "/ventas",
        icon: Receipt,
        permission: "sales:view",
      },
      {
        label: "Cobranza",
        href: "/cobranza",
        icon: Banknote,
        permission: "cash:view",
      },
      {
        label: "Caja",
        href: "/caja",
        icon: Wallet,
        permission: "cash:view",
      },
      {
        label: "Firmas",
        href: "/firmas",
        icon: CalendarCheck,
        permission: "signings:view",
      },
    ],
  },
  {
    label: "Comunicacion",
    items: [
      {
        label: "Mensajes",
        href: "/mensajes",
        icon: MessageSquare,
        permission: "dashboard:view",
      },
    ],
  },
  {
    label: "Administracion",
    items: [
      {
        label: "Configuracion",
        href: "/configuracion",
        icon: Settings,
        permission: "users:view",
      },
      {
        label: "Registros",
        href: "/auditoria",
        icon: ClipboardList,
        permission: "config:manage",
      },
    ],
  },
];
