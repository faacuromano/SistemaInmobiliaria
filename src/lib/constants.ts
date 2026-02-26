import type {
  DevelopmentStatus,
  DevelopmentType,
  LotStatus,
  PersonType,
  SaleStatus,
  Currency,
  InstallmentStatus,
  ExtraChargeStatus,
  MovementType,
  SigningStatus,
  Role,
} from "@/types/enums";

export const DEVELOPMENT_STATUS_LABELS: Record<DevelopmentStatus, string> = {
  PLANIFICACION: "Planificación",
  EN_CURSO: "En Curso",
  FINALIZADO: "Finalizado",
  PAUSADO: "Pausado",
};

export const DEVELOPMENT_TYPE_LABELS: Record<DevelopmentType, string> = {
  INMOBILIARIO: "Inmobiliario",
  OTROS: "Otros",
};

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  DISPONIBLE: "Disponible",
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
  CONTADO: "Contado",
  ESCRITURADO: "Escriturado",
  CESION: "Cesión",
  PERMUTA: "Permuta",
};

export const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  CLIENTE: "Cliente",
  PROVEEDOR: "Proveedor",
  AMBOS: "Ambos",
};

export const DEVELOPMENT_STATUS_COLORS: Record<
  DevelopmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  EN_CURSO: "default",
  PLANIFICACION: "secondary",
  FINALIZADO: "outline",
  PAUSADO: "destructive",
};

export const LOT_STATUS_COLORS: Record<
  LotStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DISPONIBLE: "default",
  RESERVADO: "secondary",
  VENDIDO: "outline",
  CONTADO: "outline",
  ESCRITURADO: "outline",
  CESION: "secondary",
  PERMUTA: "destructive",
};

export const PERSON_TYPE_COLORS: Record<
  PersonType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CLIENTE: "default",
  PROVEEDOR: "secondary",
  AMBOS: "outline",
};

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  ACTIVA: "Activa",
  CANCELADA: "Cancelada",
  COMPLETADA: "Completada",
  CONTADO: "Contado",
  CESION: "Cesión",
};

export const SALE_STATUS_COLORS: Record<
  SaleStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVA: "default",
  COMPLETADA: "outline",
  CANCELADA: "destructive",
  CONTADO: "secondary",
  CESION: "secondary",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "Dólares (USD)",
  ARS: "Pesos (ARS)",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
  PARCIAL: "Parcial",
};

export const INSTALLMENT_STATUS_COLORS: Record<
  InstallmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDIENTE: "default",
  PAGADA: "outline",
  VENCIDA: "destructive",
  PARCIAL: "secondary",
};

export const EXTRA_CHARGE_STATUS_LABELS: Record<ExtraChargeStatus, string> = {
  PENDIENTE: "Pendiente",
  PAGADA: "Pagada",
  VENCIDA: "Vencida",
  PARCIAL: "Parcial",
};

export const EXTRA_CHARGE_STATUS_COLORS: Record<
  ExtraChargeStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDIENTE: "default",
  PAGADA: "outline",
  VENCIDA: "destructive",
  PARCIAL: "secondary",
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  CUOTA: "Cuota",
  ENTREGA: "Entrega",
  COMISION: "Comisión",
  SUELDO: "Sueldo",
  CAMBIO: "Cambio moneda",
  RETIRO: "Retiro socio",
  GASTO_PROYECTO: "Gasto proyecto",
  GASTO_OFICINA: "Gasto oficina",
  FIDEICOMISO: "Fideicomiso",
  BANCO: "Banco",
  CONTABLE: "Contable",
  PRESTAMO: "Préstamo",
  IMPUESTO: "Impuesto",
  ALQUILER: "Alquiler",
  MARKETING: "Marketing",
  COCHERA: "Cochera",
  DESARROLLO: "Desarrollo",
  VARIOS: "Varios",
};

export const MOVEMENT_TYPE_COLORS: Record<
  MovementType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  CUOTA: "default",
  ENTREGA: "default",
  COMISION: "secondary",
  SUELDO: "secondary",
  CAMBIO: "outline",
  RETIRO: "destructive",
  GASTO_PROYECTO: "destructive",
  GASTO_OFICINA: "destructive",
  FIDEICOMISO: "secondary",
  BANCO: "outline",
  CONTABLE: "outline",
  PRESTAMO: "destructive",
  IMPUESTO: "destructive",
  ALQUILER: "default",
  MARKETING: "destructive",
  COCHERA: "default",
  DESARROLLO: "destructive",
  VARIOS: "outline",
};

export const SIGNING_STATUS_LABELS: Record<SigningStatus, string> = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  REPROGRAMADA: "Reprogramada",
};

export const SIGNING_STATUS_COLORS: Record<
  SigningStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDIENTE: "default",
  CONFIRMADA: "secondary",
  COMPLETADA: "outline",
  CANCELADA: "destructive",
  REPROGRAMADA: "secondary",
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMINISTRACION: "Administracion",
  FINANZAS: "Finanzas",
  COBRANZA: "Cobranza",
};

export const ROLE_COLORS: Record<
  Role,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SUPER_ADMIN: "destructive",
  ADMINISTRACION: "default",
  FINANZAS: "secondary",
  COBRANZA: "outline",
};
