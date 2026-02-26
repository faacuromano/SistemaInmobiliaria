# CLAUDE.md — Sistema Inmobiliaria

## CONTEXTO DEL PROYECTO
- **Nombre**: Sistema Inmobiliaria — ERP para gestión de desarrollos inmobiliarios
- **Stack**: Next.js 15 (App Router) + TypeScript + PostgreSQL + Prisma ORM
- **Auth**: Auth.js v5 con RBAC (SUPER_ADMIN, ADMINISTRACION, FINANZAS, COBRANZA)
- **UI**: shadcn/ui + Tailwind CSS
- **Validación**: Zod
- **Monedas**: Dual USD/ARS con cotización diaria (dolarapi.com)
- **Schema Prisma**: `prisma/schema.prisma` — 16+ modelos de dominio inmobiliario

## MODELOS DE DOMINIO CLAVE
- **User** → Usuarios del sistema con roles RBAC
- **Development** → Desarrollos inmobiliarios (INMOBILIARIO, OTROS)
- **Lot** → Lotes dentro de desarrollos (estados: DISPONIBLE, VENDIDO, CONTADO, CESION, PERMUTA)
- **Person** → Clientes/Proveedores (CLIENTE, PROVEEDOR, AMBOS)
- **Seller** → Vendedores comerciales con comisiones
- **Sale** → Ventas (ACTIVA, CANCELADA, COMPLETADA, CONTADO, CESION)
- **Installment** → Cuotas ordinarias con recálculo por refuerzos
- **ExtraCharge** → Cuotas de refuerzo/extraordinarias
- **CashMovement** → Movimientos de caja unificados (14 tipos: CUOTA, SUELDO, COMISION, etc.)
- **ExchangeRate** → Cotización diaria USD/ARS
- **PaymentReceipt** → Recibos de pago auto-generados
- **SigningSlot** → Agenda de turnos de escrituración
- **Message/Notification** → Mensajería interna y alertas del sistema
- **AuditLog** → Trazabilidad completa de operaciones

## FLUJOS DE NEGOCIO CRITICOS
1. **Venta Normal**: Person → Sale → auto-generar Installments → Lot.status = VENDIDO
2. **Pago de Cuota**: Seleccionar Installment → obtener ExchangeRate → crear CashMovement → marcar PAGADA
3. **Refuerzo a mitad de plan**: Crear ExtraCharge → pagar → recalcular Installments pendientes
4. **Proveedor con lote**: Person(PROVEEDOR) → Sale(totalPrice=0, CESION) → Lot(PERMUTA)
5. **Contado**: Sale(totalInstallments=0, CONTADO) → CashMovement(ENTREGA) → Lot(CONTADO)

## ARQUITECTURA DE CARPETAS
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Paginas publicas (login)
│   ├── (dashboard)/        # Paginas protegidas
│   │   ├── desarrollos/
│   │   ├── lotes/
│   │   ├── personas/
│   │   ├── ventas/
│   │   ├── caja/
│   │   ├── firmas/
│   │   └── configuracion/
│   └── api/                # API Routes
├── server/
│   ├── models/             # Data access layer (Prisma wrappers)
│   ├── services/           # Business logic
│   ├── controllers/        # Request handlers
│   └── actions/            # Server Actions
├── lib/                    # Utilidades compartidas
├── schemas/                # Zod validation schemas
├── types/                  # TypeScript definitions
├── components/             # React components (shadcn/ui)
│   ├── ui/                 # shadcn primitives
│   └── shared/             # Componentes compartidos
├── hooks/                  # Custom React hooks
├── providers/              # Context providers
└── styles/
```
