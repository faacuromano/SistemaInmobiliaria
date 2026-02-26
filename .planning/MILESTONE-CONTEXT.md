# Milestone v1.1 Context

**Gathered:** 2026-02-26
**Source:** User input during /gsd:new-milestone
**Status:** Ready for requirements definition

## Milestone Focus

Bug fixes, UX polish, and targeted feature improvements across Estadísticas, Desarrollos, Personas, and Mensajes modules.

## User-Reported Issues

### Estadísticas
1. **Movimientos Mensuales table** — confusing, unclear, poorly differentiated visually
2. **Rendimientos de Cobranza** — shows wrong information. Unclear if it tracks cuotas (installments) or terrenos en venta (lots for sale). If it tracks cuotas, it's wrong: marks future-month installments as paid even though nothing changed. **Needs deep analysis of the underlying logic.**

### Desarrollos
3. **New Lot popup** — no margins/padding in the dialog at /desarrollos/raíces
4. **Edit lot when sold** — status Select is correctly disabled, but the disabled field doesn't send its value → backend receives null → error. Need to send the current status value even when disabled.
5. **Bulk lot editing** — modifying lots (terrenos/casas) one by one from Lista is nearly impossible. Same problem with tags. Needs bulk edit capability.
6. **Google Maps location** — wants a field where they can link a Google Maps URL so users can click to see the location, or alternatively embed a map showing the location.

### Personas
7. **Person info display** — shown in a generic, non-optimal way. Needs better layout/presentation.

### Mensajes
8. **Send message popup** — no padding or margins in the dialog.

## Suggested Version

v1.1 — Bug Fixes & UX Polish

## Suggested Categories

- **STAT** — Estadísticas fixes (items 1-2)
- **DEV** — Desarrollos fixes and features (items 3-6)
- **PERS** — Personas improvements (item 7)
- **MSG** — Mensajes fixes (item 8)

## Notes

- Item 2 (Rendimientos de Cobranza) needs deep code analysis before requirements can be finalized
- Item 6 (Google Maps) is a new feature, not a bug fix
- Items 3, 8 are quick CSS/spacing fixes
- Item 4 is a form submission bug
- Item 5 is a UX improvement (bulk operations)
