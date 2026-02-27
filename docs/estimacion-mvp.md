# Estimación MVP — Sistema Inmobiliaria

**Fecha:** 27 de Febrero de 2026
**Análisis basado en:** código fuente, `docs/analisis-requerimientos.md`, `docs/Presupuesto.png`, schema Prisma, y estructura completa del proyecto.

---

## 1. ESTADO ACTUAL DEL PROYECTO (Inventario Real)

### Métricas del Codebase

| Métrica | Valor |
|---------|-------|
| Archivos TypeScript/TSX | 212 |
| Líneas de código (src/) | ~27,320 |
| Páginas/Rutas | 21 |
| Server Actions | 21 archivos |
| Modelos (Data Access) | 19 archivos |
| API Routes | 3 |
| Componentes UI | 30 (12 shared + 18 shadcn/ui) |
| Schema Prisma | 714 líneas, 16+ modelos |
| Tests | 7 archivos (3 unit, 2 integration, 1 smoke, 1 parity) |

### Módulos Implementados vs. Presupuesto Original

El presupuesto (`Presupuesto.png`) comprometía:

| Item del Presupuesto | Estado | Completitud |
|---|---|---|
| Configuración de entorno, dominio y SSL | 🟢 Hecho | Docker + compose listos. SSL depende del deploy |
| Sistema de autenticación y gestión de roles (4 roles) | 🟢 Completo | Auth.js v5 + RBAC con 21 permisos |
| Módulo de desarrollos y lotes (panel lateral + listado) | 🟢 Completo | CRUD completo + grilla visual con colores por estado |
| Fichas de clientes por lote (datos, cuotas, anotaciones, etiquetas) | 🟡 ~60% | Datos y notas OK. Falta: resumen deuda, historial pagos, cuotas pendientes |
| Motor de cálculo de cuotas variables + cuotas de refuerzo | 🟢 Completo | Generador, recalculador, pagos parciales, estados automáticos |
| Módulo de proveedores (con pagos en lotes) | 🟡 ~40% | Lógica CESION/PERMUTA funciona. Falta: UI dedicada, gestión de pagos a proveedores |
| Módulo de caja (ingresos y egresos por proyecto) | 🟢 Completo | 14 tipos de movimiento, dual USD/ARS |
| Integración caja + cobros (reloj automático) | 🟢 Completo | Módulo /cobranza con reflejo inmediato en /caja |
| Emisión y envío de documentos de pago | 🟢 Completo | Recibos auto-generados + 3 templates email |
| Importación de datos vía CSV/Excel | 🟡 ~30% | Solo JSON implementado. Falta CSV/Excel y export |
| Sistema de notificaciones (alerta 3 días refuerzo) | 🟡 ~50% | Refuerzo y cuota vencida OK. Falta: firma próxima, pago recibido |
| Mensajería interna entre usuarios | 🟢 Completo | Envío, múltiples destinatarios, tracking de lectura |
| Estadísticas | 🟢 Completo | KPIs, ingresos/egresos mensuales, tasa cobranza, YoY |
| Testing y corrección de bugs | 🟡 ~15% | 7 tests básicos. Sin E2E, sin cobertura de servicios/actions |
| Diseño UI/UX (wireframes + prototipo) | 🟢 Hecho | Implementado con shadcn/ui + Tailwind |
| Back end developer (180-200 hrs) | 🟢 ~85% | Lógica core completa |
| Front end developer (40-50 hrs) | 🟢 ~80% | UI funcional, falta pulido mobile |

---

## 2. QUÉ FALTA PARA EL MVP (Gap Analysis)

### CRÍTICO — Sin esto no se puede entregar

| # | Feature Faltante | Esfuerzo | Horas Est. | Justificación |
|---|---|---|---|---|
| 1 | **Backups automáticos** | Bajo | 4-6h | Riesgo de pérdida de datos. Script pg_dump + cron + storage |
| 2 | **Import CSV/Excel** | Medio | 16-24h | Prometido explícitamente en presupuesto. Necesario para migración de datos del cliente |
| 3 | **Ficha de Cliente completa** | Medio | 12-16h | Presupuesto dice "datos, cuotas, anotaciones, etiquetas". Falta deuda, historial de pagos, cuotas pendientes con próximo vencimiento |
| 4 | **Testing mínimo** | Alto | 24-32h | Presupuesto incluye "Testing y corrección de bugs". Se necesita al menos tests de flujos críticos (venta, pago, recálculo) |

### IMPORTANTE — Comprometido en presupuesto, debería incluirse

| # | Feature Faltante | Esfuerzo | Horas Est. | Justificación |
|---|---|---|---|---|
| 5 | **UI de Proveedores** | Medio | 8-12h | Presupuesto dice "Módulo de proveedores (con pagos en lotes)". La lógica CESION existe pero no hay interfaz dedicada |
| 6 | **Alertas faltantes** (firma próxima, pago recibido) | Bajo | 4-6h | Tipos definidos en schema, solo falta lógica en cron |
| 7 | **Headers de seguridad** | Bajo | 2-3h | HSTS, CSP, X-Frame-Options para producción |
| 8 | **Sidebar colapsable mobile** | Bajo | 4-6h | Responsividad incompleta. Falta drawer/hamburger |

### OPCIONAL — Diferenciador pero no esencial para MVP

| # | Feature Faltante | Esfuerzo | Horas Est. | Justificación |
|---|---|---|---|---|
| 9 | **Mapa Interactivo geográfico** | Alto | 30-40h | Feature diferenciadora. Requiere coords lat/lng en modelo Lot + integración Leaflet/Mapbox |
| 10 | **Export de datos** (CSV/Excel/PDF) | Medio | 8-12h | No comprometido pero esperado por el cliente |
| 11 | **Gráficos/Charts** | Medio | 8-12h | Solo hay barras CSS. Charts mejoraría mucho las estadísticas |
| 12 | **Notificaciones push navegador** | Medio | 6-8h | Hoy requiere recargar la página para ver notificaciones |

### POSPUESTO (Confirmado)

| # | Feature | Notas |
|---|---|---|
| 13 | Virtual Tour 360° | Acordado para etapa posterior |

---

## 3. ESTIMACIÓN DE HORAS RESTANTES

### Escenario A: MVP Mínimo Entregable (solo lo crítico)
> Lo mínimo para poder decir "cumple con el presupuesto".

| Categoría | Horas |
|---|---|
| Backups automáticos | 5h |
| Import CSV/Excel | 20h |
| Ficha de Cliente completa | 14h |
| Testing flujos críticos | 28h |
| Corrección de bugs finales | 8h |
| **TOTAL** | **~75h** |

### Escenario B: MVP Completo (todo lo comprometido)
> Cumple completamente con cada línea del presupuesto.

| Categoría | Horas |
|---|---|
| Todo del Escenario A | 75h |
| UI de Proveedores | 10h |
| Alertas faltantes | 5h |
| Headers de seguridad | 3h |
| Sidebar mobile | 5h |
| Deploy + SSL + dominio | 4h |
| **TOTAL** | **~102h** |

### Escenario C: MVP Premium (con diferenciadores)
> Incluye features que el cliente probablemente espera aunque no estén en el presupuesto literal.

| Categoría | Horas |
|---|---|
| Todo del Escenario B | 102h |
| Mapa Interactivo | 35h |
| Export datos | 10h |
| Charts/Gráficos | 10h |
| **TOTAL** | **~157h** |

---

## 4. ANÁLISIS FINANCIERO

### Presupuesto Original (desde Presupuesto.png)
- **Back end:** 180-200 horas
- **Front end:** 40-50 horas
- **Total estimado:** 220-250 horas a USD 20/hora = **~USD 4,400-5,000**
- **Precio acordado con el cliente:** ~USD 4,000

### Horas Ya Invertidas (estimación por volumen de código)
- 27,320 líneas de código en 212 archivos
- Estimación conservadora: **~180-220 horas ya invertidas**
- Esto representa un ~85% del total presupuestado

### Horas Restantes vs. Presupuesto

| Escenario | Horas Restantes | Horas Totales (invertidas + restantes) | vs. Presupuesto (250h) |
|---|---|---|---|
| A (Mínimo) | ~75h | ~275h | +10% sobre presupuesto |
| B (Completo) | ~102h | ~302h | +21% sobre presupuesto |
| C (Premium) | ~157h | ~357h | +43% sobre presupuesto |

### Costo Restante a USD 20/hora

| Escenario | Costo Restante |
|---|---|
| A (Mínimo) | ~USD 1,500 |
| B (Completo) | ~USD 2,040 |
| C (Premium) | ~USD 3,140 |

---

## 5. PORCENTAJE DE AVANCE GLOBAL

### Por módulos comprometidos (15 items del presupuesto)

```
██████████████████████████████████████░░░░░░░░░░  ~76% COMPLETADO

🟢 Completo (10/15):   Entorno, Auth/Roles, Desarrollos, Lotes,
                        Motor Cuotas, Caja, Cobros, Comprobantes,
                        Mensajería, Estadísticas

🟡 Parcial (4/15):     Ficha Cliente (~60%), Proveedores (~40%),
                        Import datos (~30%), Notificaciones (~50%)

🔴 Incompleto (1/15):  Testing (~15%)
```

### Por volumen de trabajo (horas)

```
Invertido:   ~200h  ████████████████████████████████████████  80%
Restante:    ~50h   ██████████                                20%  (Escenario A sin testing)

Con testing: ~75h   ███████████████                           +30%
```

---

## 6. RIESGOS IDENTIFICADOS

| Riesgo | Impacto | Probabilidad | Mitigación |
|---|---|---|---|
| Sin backups → pérdida de datos en prod | 🔴 Crítico | Alta (si se deploya sin) | Implementar ANTES del deploy |
| Testing insuficiente → bugs en producción | 🟡 Alto | Media | Al menos tests de flujos de pago |
| Import solo JSON → cliente no puede migrar datos | 🟡 Alto | Alta (los datos vienen en Excel) | Priorizar CSV/Excel parser |
| Sin mapa → cliente percibe producto incompleto | 🟡 Medio | Media | Comunicar que la grilla visual cubre el caso de uso o negociar |
| Ficha cliente incompleta → experiencia pobre para cobranza | 🟡 Alto | Alta | Es de las features más usadas diariamente |

---

## 7. RECOMENDACIÓN: ORDEN DE PRIORIDAD PARA CERRAR EL MVP

```
SEMANA 1 (20h):
  1. Backups automáticos (5h) — CRITICO para producción
  2. Ficha de Cliente completa (14h) — Alto impacto diario

SEMANA 2 (20h):
  3. Import CSV/Excel (20h) — Prometido y necesario para migración

SEMANA 3 (20h):
  4. UI Proveedores (10h) — Comprometido en presupuesto
  5. Alertas faltantes (5h) — Bajo esfuerzo, alto valor
  6. Sidebar mobile + headers seguridad (5h) — Pulido final

SEMANA 4 (15-28h):
  7. Testing de flujos críticos (15-28h) — Según nivel de rigurosidad
  8. Corrección de bugs encontrados en testing (variable)

TOTAL ESTIMADO: 4-5 semanas a medio tiempo (~20h/semana)
```

---

## 8. CONCLUSIÓN

El proyecto está en un **~76% de avance** respecto a lo comprometido en el presupuesto. La base del sistema (autenticación, ventas, cuotas, caja, cobros, recibos) está **sólida y funcional**. Los 10 módulos core funcionan correctamente.

Lo que falta es mayormente:
- **Completar features parciales** (ficha cliente, proveedores, import, alertas) — son extensiones de lo que ya existe
- **Testing** — el más costoso en horas pero necesario para entrega profesional
- **Hardening para producción** (backups, headers, mobile)

**Para un software de USD 4,000**, el alcance implementado es coherente. El riesgo principal es el desfase entre horas presupuestadas (~250h) y horas reales necesarias (~275-300h para entrega completa). Se recomienda priorizar los Escenarios A o B y comunicar claramente al cliente qué queda fuera del alcance (mapa interactivo, charts, export).

El mapa interactivo (30-40h) es el item más caro pendiente y el más debatible — la grilla visual de lotes cubre el caso de uso operativo, aunque no el visual/comercial. Se recomienda negociarlo como fase 2 o cobro adicional.
