# _plan_raw/ — Artefactos de Planificación SDD

Este directorio contiene los artefactos vivos del flujo SDD.
El orquestador y los sub-agentes leen y escriben aquí durante el desarrollo de features.

## Estructura por Feature
```
_plan_raw/
├── <feature-name>/
│   ├── 01-exploration.md      # Output del Explorer
│   ├── 02-proposal.md         # Output del Proposer (requiere aprobación)
│   ├── 03-spec.md             # Output del Spec Writer
│   ├── 04-design.md           # Output del Designer
│   ├── 05-tasks.md            # Output del Task Planner (con checkboxes)
│   ├── 06-verification.md     # Output del Verifier
│   └── 07-archive.md          # Output del Archiver
├── contracts/                 # Contratos API compartidos front↔back
│   └── <feature>-api.ts       # Tipos TypeScript del contrato
└── README.md                  # Este archivo
```

## Estados de una Feature
- 🔵 exploring — Se está analizando el codebase
- 🟡 proposed — Propuesta generada, pendiente aprobación
- 🟢 speced — Specs y design completados
- 🔨 implementing — Tareas en progreso
- ✅ verified — Implementación validada contra specs
- 📦 archived — Feature cerrada y documentada

## Convenciones
- **Nombres de carpeta**: kebab-case del nombre de la feature (ej: `gestion-ventas`)
- **Contratos**: Se publican en `contracts/` con formato `<feature>-api.ts`
- **Numeración**: Los archivos siguen el orden del DAG (01 a 07)
- **Inmutabilidad**: Una vez aprobado un artefacto, no se modifica (se crea nueva versión si es necesario)
