// Client-safe enum values mirroring Prisma enums
// Used in client components and Zod schemas to avoid importing the Prisma runtime

export const DevelopmentStatus = {
  PLANIFICACION: "PLANIFICACION",
  EN_CURSO: "EN_CURSO",
  FINALIZADO: "FINALIZADO",
  PAUSADO: "PAUSADO",
} as const;
export type DevelopmentStatus =
  (typeof DevelopmentStatus)[keyof typeof DevelopmentStatus];

export const DevelopmentType = {
  INMOBILIARIO: "INMOBILIARIO",
  OTROS: "OTROS",
} as const;
export type DevelopmentType =
  (typeof DevelopmentType)[keyof typeof DevelopmentType];

export const LotStatus = {
  DISPONIBLE: "DISPONIBLE",
  RESERVADO: "RESERVADO",
  VENDIDO: "VENDIDO",
  CONTADO: "CONTADO",
  ESCRITURADO: "ESCRITURADO",
  CESION: "CESION",
  PERMUTA: "PERMUTA",
} as const;
export type LotStatus = (typeof LotStatus)[keyof typeof LotStatus];

export const PersonType = {
  CLIENTE: "CLIENTE",
  PROVEEDOR: "PROVEEDOR",
  AMBOS: "AMBOS",
} as const;
export type PersonType = (typeof PersonType)[keyof typeof PersonType];

export const SaleStatus = {
  ACTIVA: "ACTIVA",
  CANCELADA: "CANCELADA",
  COMPLETADA: "COMPLETADA",
  CONTADO: "CONTADO",
  CESION: "CESION",
} as const;
export type SaleStatus = (typeof SaleStatus)[keyof typeof SaleStatus];

export const Currency = {
  USD: "USD",
  ARS: "ARS",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const InstallmentStatus = {
  PENDIENTE: "PENDIENTE",
  PAGADA: "PAGADA",
  VENCIDA: "VENCIDA",
  PARCIAL: "PARCIAL",
} as const;
export type InstallmentStatus =
  (typeof InstallmentStatus)[keyof typeof InstallmentStatus];

export const ExtraChargeStatus = {
  PENDIENTE: "PENDIENTE",
  PAGADA: "PAGADA",
  VENCIDA: "VENCIDA",
  PARCIAL: "PARCIAL",
} as const;
export type ExtraChargeStatus =
  (typeof ExtraChargeStatus)[keyof typeof ExtraChargeStatus];

export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMINISTRACION: "ADMINISTRACION",
  FINANZAS: "FINANZAS",
  COBRANZA: "COBRANZA",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const SigningStatus = {
  PENDIENTE: "PENDIENTE",
  CONFIRMADA: "CONFIRMADA",
  COMPLETADA: "COMPLETADA",
  CANCELADA: "CANCELADA",
  REPROGRAMADA: "REPROGRAMADA",
} as const;
export type SigningStatus =
  (typeof SigningStatus)[keyof typeof SigningStatus];

export const InstallmentMode = {
  AUTOMATICO: "AUTOMATICO",
  MANUAL: "MANUAL",
} as const;
export type InstallmentMode =
  (typeof InstallmentMode)[keyof typeof InstallmentMode];

export const CesionType = {
  GRATIS: "GRATIS",
  CANJE: "CANJE",
} as const;
export type CesionType = (typeof CesionType)[keyof typeof CesionType];

export const PaymentMethod = {
  EFECTIVO: "EFECTIVO",
  TRANSFERENCIA: "TRANSFERENCIA",
} as const;
export type PaymentMethod =
  (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const MovementType = {
  CUOTA: "CUOTA",
  ENTREGA: "ENTREGA",
  COMISION: "COMISION",
  SUELDO: "SUELDO",
  CAMBIO: "CAMBIO",
  RETIRO: "RETIRO",
  GASTO_PROYECTO: "GASTO_PROYECTO",
  GASTO_OFICINA: "GASTO_OFICINA",
  FIDEICOMISO: "FIDEICOMISO",
  BANCO: "BANCO",
  CONTABLE: "CONTABLE",
  PRESTAMO: "PRESTAMO",
  IMPUESTO: "IMPUESTO",
  ALQUILER: "ALQUILER",
  MARKETING: "MARKETING",
  COCHERA: "COCHERA",
  DESARROLLO: "DESARROLLO",
  VARIOS: "VARIOS",
} as const;
export type MovementType = (typeof MovementType)[keyof typeof MovementType];
