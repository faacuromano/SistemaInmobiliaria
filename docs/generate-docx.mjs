import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageBreak, Header, Footer, TabStopPosition, TabStopType,
} from "docx";
import { writeFileSync } from "fs";

// --- Color constants ---
const GREEN = "2E7D32";
const YELLOW = "F57F17";
const RED = "C62828";
const GRAY = "757575";
const BLUE = "1565C0";
const DARK = "1E293B";
const WHITE = "FFFFFF";
const LIGHT_BG = "F8FAFC";
const BORDER_COLOR = "CBD5E1";

// --- Helpers ---
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 300, after: 150 }, children: [new TextRun({ text, bold: true, color: DARK })] });
}

function bodyText(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, size: 22, ...opts })] });
}

function statusIcon(status) {
  if (status === "green") return { text: "COMPLETO", color: GREEN };
  if (status === "yellow") return { text: "PARCIAL", color: YELLOW };
  if (status === "red") return { text: "FALTA", color: RED };
  return { text: "POSPUESTO", color: GRAY };
}

function cell(text, opts = {}) {
  const { bold, color, shading, width, alignment } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: shading ? { type: ShadingType.SOLID, color: shading } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: alignment || AlignmentType.LEFT,
      children: [new TextRun({ text: text || "", size: 20, bold: !!bold, color: color || "333333" })],
    })],
  });
}

function headerCell(text, width) {
  return cell(text, { bold: true, color: WHITE, shading: DARK, width });
}

function statusCell(status, width) {
  const s = statusIcon(status);
  return cell(s.text, { bold: true, color: WHITE, shading: s.color, width, alignment: AlignmentType.CENTER });
}

function tableRow(cells) {
  return new TableRow({ children: cells });
}

function makeTable(headerTexts, headerWidths, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      tableRow(headerTexts.map((t, i) => headerCell(t, headerWidths[i]))),
      ...rows,
    ],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 100, after: 100 }, children: [] });
}

// --- Build Document ---
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Segoe UI", size: 22, color: "333333" } },
      heading1: { run: { font: "Segoe UI", size: 36, bold: true, color: DARK } },
      heading2: { run: { font: "Segoe UI", size: 28, bold: true, color: BLUE } },
      heading3: { run: { font: "Segoe UI", size: 24, bold: true, color: DARK } },
    },
  },
  sections: [{
    properties: {
      page: { margin: { top: 1200, bottom: 1000, left: 1200, right: 1200 } },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Sistema Inmobiliaria — Analisis de Requerimientos", size: 16, color: GRAY, italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Documento generado el 25 de Febrero de 2026", size: 16, color: GRAY })],
        })],
      }),
    },
    children: [
      // --- COVER ---
      new Paragraph({ spacing: { before: 2000 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SISTEMA INMOBILIARIA", size: 52, bold: true, color: DARK })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "ERP para Gestion de Desarrollos Inmobiliarios", size: 28, color: BLUE })] }),
      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Analisis de Requerimientos vs. Estado Actual", size: 36, bold: true, color: DARK })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "25 de Febrero de 2026", size: 24, color: GRAY })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // === SECTION 1: SEGURIDAD ===
      heading("1. Seguridad e Infraestructura"),
      spacer(),
      makeTable(
        ["Requerimiento", "Estado", "Detalle"],
        [22, 12, 66],
        [
          tableRow([cell("Hosting y SSL", { bold: true }), statusCell("yellow"), cell("Dockerfile + docker-compose.yml listos (Node 22, PostgreSQL 16, healthcheck). SSL depende del deploy. Faltan headers de seguridad (HSTS, CSP, X-Frame-Options).")]),
          tableRow([cell("Backups diarios", { bold: true }), statusCell("red"), cell("No hay script de pg_dump, ni cron de backup, ni integracion con almacenamiento cloud. Solo volumen Docker local.")]),
          tableRow([cell("Auditoria de cambios", { bold: true }), statusCell("green"), cell("Modelo AuditLog con 3 indices. logAction() integrado en 24 operaciones CRUD. Pagina /auditoria con filtros y tabla completa.")]),
          tableRow([cell("Encriptado", { bold: true }), statusCell("yellow"), cell("Passwords con bcrypt, sesiones JWT. Falta encriptacion at-rest de datos sensibles (DNI, CUIT) y HTTPS forzado a nivel app.")]),
          tableRow([cell("Autenticacion", { bold: true }), statusCell("green"), cell("Auth.js v5 con Credentials, bcrypt, JWT, middleware en todas las rutas, redirect automatico a /login.")]),
          tableRow([cell("QA / Testing", { bold: true }), statusCell("red"), cell("No hay tests unitarios, de integracion ni E2E. Sin configuracion de framework de testing.")]),
        ]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // === SECTION 2: FUNCIONALIDADES ===
      heading("2. Funcionalidades del Sistema"),

      // 2.1
      heading("2.1 Acceso Total (Web Responsiva)", HeadingLevel.HEADING_2),
      statusBadge("green"),
      bodyText("Tailwind CSS con breakpoints sm/md/lg aplicados en todo el sistema. Grids adaptativos (1-2-4 columnas en KPIs, 4-10 en lotes), dialogs responsive, tablas con scroll horizontal. Funciona en movil, tablet y desktop."),
      bodyText("Pendiente menor: el sidebar no colapsa en mobile (siempre w-56). Falta drawer/hamburger menu.", { italics: true, color: GRAY }),
      spacer(),

      // 2.2
      heading("2.2 Roles: 4 Niveles", HeadingLevel.HEADING_2),
      statusBadge("green"),
      makeTable(
        ["Rol", "Permisos Clave"],
        [25, 75],
        [
          tableRow([cell("SUPER_ADMIN", { bold: true }), cell("Acceso total a todas las funciones")]),
          tableRow([cell("ADMINISTRACION", { bold: true }), cell("Desarrollos, Lotes, Personas, Ventas, Firmas, Usuarios (CRUD completo)")]),
          tableRow([cell("FINANZAS", { bold: true }), cell("Caja (ver + gestionar), Personas y Ventas (solo lectura)")]),
          tableRow([cell("COBRANZA", { bold: true }), cell("Caja (solo ver), Personas y Ventas (solo lectura)")]),
        ]
      ),
      bodyText("21 permisos definidos con checks hardcoded + overrides desde base de datos. Sidebar filtra navegacion por rol."),
      spacer(),

      // 2.3
      heading("2.3 Dashboard: Metricas", HeadingLevel.HEADING_2),
      statusBadge("green"),
      bodyText("Dashboard principal con 4 KPIs: Ventas Activas, Cuotas Vencidas, Ingresos del Mes (USD+ARS), Lotes Disponibles. Tabla de ventas recientes. Firmas proximas."),
      bodyText("Pagina de Estadisticas con ingresos/egresos mensuales, resumen de ventas por estado, tasa de cobranza con barra visual, comparacion interanual (YoY), filtros por anio y desarrollo."),
      bodyText("Pendiente: no hay graficos/charts (solo tablas y barras CSS), no hay auto-refresh.", { italics: true, color: GRAY }),
      spacer(),

      // 2.4
      heading("2.4 Mapa Interactivo", HeadingLevel.HEADING_2),
      statusBadge("red"),
      bodyText("No existe mapa geografico. No hay integracion con Leaflet, Mapbox ni Google Maps. No hay coordenadas lat/lng en el modelo de Lote."),
      bodyText("Existe una grilla visual de lotes (lots-grid.tsx) con colores por estado, pero no es un mapa interactivo geografico."),
      spacer(),

      // 2.5
      heading("2.5 Integracion Virtual Tour 360", HeadingLevel.HEADING_2),
      statusBadge("gray"),
      bodyText("Pospuesto segun lo acordado. Se realizara en una etapa posterior."),
      spacer(),

      // 2.6
      heading("2.6 Ficha de Cliente", HeadingLevel.HEADING_2),
      statusBadge("yellow"),
      bodyText("Implementado: pagina de detalle con datos personales, contacto, notas y lista de ventas asociadas. Filtro por tipo (CLIENTE, PROVEEDOR, AMBOS)."),
      bodyText("Falta: resumen de deuda total (USD/ARS), historial de pagos cronologico, cuotas pendientes con proximo vencimiento, movimientos de caja vinculados, acciones rapidas de cobro."),
      spacer(),

      new Paragraph({ children: [new PageBreak()] }),

      // 2.7
      heading("2.7 Calculo de Cuotas", HeadingLevel.HEADING_2),
      statusBadge("green"),
      bodyText("Motor completo: cuotas variables con primera cuota diferenciada, dia de cobro configurable, manejo de fin de mes. Recalculador al pagar refuerzos (distribucion equitativa). Pagos parciales con estado PARCIAL. Auto-completado de venta al pagar todas las cuotas."),
      spacer(),

      // 2.8
      heading("2.8 Proveedores", HeadingLevel.HEADING_2),
      statusBadge("yellow"),
      bodyText("Personas con type=PROVEEDOR o AMBOS existen. Flujo CESION/PERMUTA funciona (Sale totalPrice=0, status=CESION, Lot pasa a PERMUTA)."),
      bodyText("Falta: interfaz especializada para proveedores y gestion de pagos a proveedores separada.", { italics: true, color: GRAY }),
      spacer(),

      // 2.9
      heading("2.9 Dolar Blue", HeadingLevel.HEADING_2),
      statusBadge("green"),
      bodyText("Cotizacion diaria automatica desde dolarapi.com (oficial, blue, cripto). Display en header con reloj en vivo. Carga manual como fallback. Tasa manual por operacion. Historial de cotizaciones."),
      spacer(),

      // 2.10
      heading("2.10 Cobranza Integrada", HeadingLevel.HEADING_2),
      statusBadge("green"),
      bodyText("Modulo /cobranza con busqueda por nombre/DNI/CUIT. Cuotas y refuerzos pendientes por cliente. Pago automatico reflejado en caja. Dual USD/ARS. Auto-completado de venta."),
      spacer(),

      // 2.11
      heading("2.11 Comprobantes", HeadingLevel.HEADING_2),
      statusBadge("green"),
      bodyText("Generacion automatica de recibo (REC-YYYYMM-NNNN). Envio por email con template HTML profesional (nodemailer, SMTP configurable). Vista con impresion. 3 templates: recibo, aviso de refuerzo, cuota vencida."),
      spacer(),

      // 2.12
      heading("2.12 Alertas", HeadingLevel.HEADING_2),
      statusBadge("yellow"),
      makeTable(
        ["Tipo de Alerta", "Estado", "Detalle"],
        [25, 12, 63],
        [
          tableRow([cell("Refuerzo proximo (3 dias)"), statusCell("green"), cell("Cron diario + email al comprador")]),
          tableRow([cell("Cuota vencida"), statusCell("green"), cell("Cron diario + email al comprador")]),
          tableRow([cell("Firma proxima"), statusCell("red"), cell("Tipo definido en schema pero sin logica de cron implementada")]),
          tableRow([cell("Pago recibido"), statusCell("red"), cell("Solo placeholder en el codigo")]),
        ]
      ),
      bodyText("Campana de notificaciones en header (ultimas 20, badge, mark as read). Sin push notifications ni real-time."),
      spacer(),

      // 2.13
      heading("2.13 Mensajeria Interna", HeadingLevel.HEADING_2),
      statusBadge("green"),
      bodyText("Mensajes entre usuarios (asunto + cuerpo), multiples destinatarios, tracking de leidos/no leidos, notificacion SISTEMA automatica, bandejas de entrada y enviados."),
      spacer(),

      // 2.14
      heading("2.14 Migracion (Import)", HeadingLevel.HEADING_2),
      statusBadge("yellow"),
      bodyText("Import de Personas y Ventas (con auto-generacion de cuotas). Deteccion de duplicados. Reporte de errores por fila."),
      bodyText("Falta: solo acepta JSON, no CSV ni Excel (.xlsx). No hay funcionalidad de exportacion.", { italics: true, color: GRAY }),

      new Paragraph({ children: [new PageBreak()] }),

      // === SECTION 3: RESUMEN ===
      heading("3. Resumen General"),
      spacer(),
      makeTable(
        ["Categoria", "Estado", "Features"],
        [20, 12, 68],
        [
          tableRow([cell("Completo", { bold: true }), statusCell("green"), cell("Autenticacion, RBAC, Dashboard, Estadisticas, Calculo de Cuotas, Dolar Blue, Cobranza, Comprobantes, Mensajeria, Auditoria, Responsive")]),
          tableRow([cell("Parcial", { bold: true }), statusCell("yellow"), cell("Hosting/SSL, Encriptado, Ficha de Cliente, Proveedores, Alertas, Import de Datos, Sidebar mobile")]),
          tableRow([cell("Falta", { bold: true }), statusCell("red"), cell("Mapa Interactivo, Backups Automaticos, Testing/QA, Alerta Firma Proxima")]),
          tableRow([cell("Pospuesto", { bold: true }), cell("POSPUESTO", { bold: true, color: WHITE, shading: GRAY }), cell("Integracion Virtual Tour 360")]),
        ]
      ),

      spacer(),
      heading("4. Prioridades Sugeridas"),
      spacer(),
      makeTable(
        ["#", "Feature", "Justificacion", "Esfuerzo"],
        [5, 22, 55, 18],
        [
          tableRow([cell("1"), cell("Backups automaticos", { bold: true }), cell("Riesgo critico de perdida de datos en produccion"), cell("Bajo")]),
          tableRow([cell("2"), cell("Alerta firma proxima", { bold: true }), cell("Prometido y casi implementado (falta logica en cron)"), cell("Bajo")]),
          tableRow([cell("3"), cell("Ficha de Cliente", { bold: true }), cell("Alto impacto de usabilidad para el equipo"), cell("Medio")]),
          tableRow([cell("4"), cell("Import CSV/Excel", { bold: true }), cell("Prometido explicitamente en el presupuesto"), cell("Medio")]),
          tableRow([cell("5"), cell("Mapa Interactivo", { bold: true }), cell("Feature diferenciadora vendida al cliente"), cell("Alto")]),
          tableRow([cell("6"), cell("Testing / QA", { bold: true }), cell("Necesario antes de entrega segun presupuesto"), cell("Alto")]),
        ]
      ),
    ],
  }],
});

function statusBadge(status) {
  const s = statusIcon(status);
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: `Estado: ${s.text}`, bold: true, size: 22, color: s.color })],
  });
}

const buffer = await Packer.toBuffer(doc);
writeFileSync("docs/analisis-requerimientos.docx", buffer);
console.log("DOCX generated: docs/analisis-requerimientos.docx");
