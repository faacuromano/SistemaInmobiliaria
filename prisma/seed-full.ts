// ============================================================================
// SEED COMPLETO — Simula 1 año de uso pleno (Marzo 2025 → Febrero 2026)
// ============================================================================
// Ejecutar: npx tsx prisma/seed-full.ts
//
// Datos generados:
// - 10 usuarios (4 roles + vendedores)
// - 5 desarrollos (4 con lotes + 1 oficina) = ~600 lotes
// - 320+ personas (clientes, proveedores)
// - 450+ ventas con planes de pago
// - Miles de cuotas, cotizaciones, movimientos de caja
// - Turnos de firma, mensajes, notificaciones, audit logs
// ============================================================================

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client/client.js";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 300_000,
});
const prisma = new PrismaClient({ adapter });

// ── Helpers ──────────────────────────────────────────────────────────────────

let cuidCounter = 0;
function cuid(): string {
  cuidCounter++;
  return (
    "c" +
    Date.now().toString(36) +
    cuidCounter.toString(36).padStart(4, "0") +
    Math.random().toString(36).slice(2, 8)
  );
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals = 2): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function dateAt(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, Math.min(day, 28)));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function formatMonthLabel(date: Date): string {
  const months = [
    "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
    "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
  ];
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function generateDNI(): string {
  return String(randomBetween(10000000, 49000000));
}

function generateCUIT(dni: string): string {
  const prefix = pickRandom(["20", "27", "23"]);
  const check = randomBetween(0, 9);
  return `${prefix}-${dni}-${check}`;
}

// Batch helper: split array into chunks and createMany
async function batchCreate<T>(
  model: { createMany: (args: { data: T[] }) => Promise<unknown> },
  data: T[],
  chunkSize = 200
) {
  for (let i = 0; i < data.length; i += chunkSize) {
    await model.createMany({ data: data.slice(i, i + chunkSize) });
  }
}

// ── Data constants ───────────────────────────────────────────────────────────

const CITIES_SF = [
  "Rosario", "Santa Fe", "Alvear", "Casilda", "Venado Tuerto",
  "Rufino", "Firmat", "San Lorenzo", "Reconquista", "Rafaela",
  "Esperanza", "San Jorge", "Arroyo Seco", "Cañada de Gómez", "Villa Constitución",
];
const STREETS = [
  "San Martín", "Belgrano", "Mitre", "Sarmiento", "Rivadavia",
  "Moreno", "Urquiza", "Pellegrini", "Córdoba", "Entre Ríos",
  "Mendoza", "Tucumán", "Oroño", "Francia", "Maipú", "Laprida",
  "Balcarce", "Catamarca", "Dorrego", "Ayacucho", "Corrientes",
];

const FIRST_NAMES_M = [
  "Juan", "Carlos", "Diego", "Pablo", "Martín", "Lucas", "Nicolás",
  "Alejandro", "Fernando", "Sebastián", "Matías", "Gonzalo", "Facundo",
  "Marcos", "Andrés", "Raúl", "Eduardo", "Roberto", "Gustavo", "Hernán",
  "Jorge", "Ricardo", "Oscar", "Damián", "Leandro", "Ignacio", "Santiago",
  "Tomás", "Agustín", "Federico", "Ezequiel", "Maximiliano", "Cristian",
  "Daniel", "Miguel", "Sergio", "Héctor", "Gabriel", "Adrián", "Ramiro",
];
const FIRST_NAMES_F = [
  "María", "Laura", "Ana", "Valentina", "Sofía", "Camila", "Carolina",
  "Luciana", "Florencia", "Daniela", "Gabriela", "Patricia", "Silvia",
  "Romina", "Natalia", "Cecilia", "Verónica", "Agustina", "Mariana",
  "Julieta", "Belén", "Rocío", "Celeste", "Yanina", "Soledad",
  "Micaela", "Aldana", "Melisa", "Noelia", "Lorena", "Paola",
];
const LAST_NAMES = [
  "González", "Rodríguez", "Martínez", "López", "García", "Fernández",
  "Pérez", "Sánchez", "Romero", "Díaz", "Torres", "Álvarez", "Ruiz",
  "Ramírez", "Flores", "Acosta", "Medina", "Herrera", "Suárez", "Aguirre",
  "Cabrera", "Molina", "Castro", "Ortiz", "Rojas", "Silva", "Gutiérrez",
  "Morales", "Vargas", "Campos", "Reyes", "Domínguez", "Vega", "Sosa",
  "Peralta", "Navarro", "Giménez", "Ponce", "Bustos", "Ríos", "Ojeda",
  "Luna", "Carrizo", "Ledesma", "Godoy", "Córdoba", "Bravo", "Robles",
];

const PROVIDER_TYPES = [
  { name: "Construcciones", service: "Movimiento de suelos" },
  { name: "Agrimensura", service: "Mensura y subdivisión" },
  { name: "Renders 3D", service: "Renders y planos" },
  { name: "Electricidad", service: "Tendido eléctrico" },
  { name: "Hidráulica", service: "Red cloacal y agua" },
  { name: "Arquitectura", service: "Proyecto y dirección" },
  { name: "Jardinería", service: "Parquización" },
  { name: "Seguridad", service: "Vigilancia y monitoreo" },
  { name: "Topografía", service: "Relevamiento topográfico" },
  { name: "Vialidad", service: "Apertura de calles" },
  { name: "Carpintería", service: "Mobiliario showroom" },
  { name: "Transporte", service: "Fletes y logística" },
];

// ── Main seed function ───────────────────────────────────────────────────────

async function main() {
  console.log("🏗️  Iniciando seed completo (escala grande)...\n");

  // ── Cleanup ──
  console.log("🧹 Limpiando datos previos...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.messageRecipient.deleteMany();
  await prisma.message.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.cashBalance.deleteMany();
  await prisma.signingSlot.deleteMany();
  await prisma.extraCharge.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.lotTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.development.deleteMany();
  await prisma.person.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();
  console.log("   Limpieza completada.\n");

  // ════════════════════════════════════════════════════════════════════════
  // 1. USUARIOS (10)
  // ════════════════════════════════════════════════════════════════════════
  console.log("👤 Creando usuarios...");
  const hashedPassword = await bcrypt.hash("Demo2025!", 12);

  const usersData = [
    { email: "admin@inmobiliaria.com", name: "Marcelo", lastName: "Fiderza", role: "SUPER_ADMIN" as const, phone: "341-555-0001", isSeller: false, commissionRate: null },
    { email: "maria@inmobiliaria.com", name: "María", lastName: "García", role: "ADMINISTRACION" as const, phone: "341-555-0002", isSeller: false, commissionRate: null },
    { email: "carlos@inmobiliaria.com", name: "Carlos", lastName: "Rodríguez", role: "FINANZAS" as const, phone: "341-555-0003", isSeller: false, commissionRate: null },
    { email: "laura@inmobiliaria.com", name: "Laura", lastName: "Martínez", role: "COBRANZA" as const, phone: "341-555-0004", isSeller: false, commissionRate: null },
    { email: "diego@inmobiliaria.com", name: "Diego", lastName: "Fernández", role: "COBRANZA" as const, phone: "341-555-0005", isSeller: true, commissionRate: 3.0 },
    { email: "ana@inmobiliaria.com", name: "Ana", lastName: "López", role: "ADMINISTRACION" as const, phone: "341-555-0006", isSeller: true, commissionRate: 2.5 },
    { email: "pablo@inmobiliaria.com", name: "Pablo", lastName: "Sánchez", role: "COBRANZA" as const, phone: "341-555-0007", isSeller: true, commissionRate: 3.5 },
    { email: "valentina@inmobiliaria.com", name: "Valentina", lastName: "Torres", role: "FINANZAS" as const, phone: "341-555-0008", isSeller: false, commissionRate: null },
    { email: "ignacio@inmobiliaria.com", name: "Ignacio", lastName: "Peralta", role: "COBRANZA" as const, phone: "341-555-0009", isSeller: true, commissionRate: 3.0 },
    { email: "romina@inmobiliaria.com", name: "Romina", lastName: "Navarro", role: "ADMINISTRACION" as const, phone: "341-555-0010", isSeller: true, commissionRate: 2.0 },
  ];

  const userIds: string[] = [];
  for (const u of usersData) {
    const id = cuid();
    userIds.push(id);
    await prisma.user.create({
      data: { id, ...u, password: hashedPassword, isActive: true },
    });
  }

  const users = await prisma.user.findMany();
  const adminId = users.find((u) => u.role === "SUPER_ADMIN")!.id;
  const sellerUsers = users.filter((u) => u.isSeller);
  const allStaffIds = users.map((u) => u.id);
  console.log(`   ${users.length} usuarios creados.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 2. SYSTEM CONFIG
  // ════════════════════════════════════════════════════════════════════════
  console.log("⚙️  Configurando sistema...");
  const configs = [
    { key: "company_name", value: "Fiderza Desarrollos" },
    { key: "company_cuit", value: "30-71654321-9" },
    { key: "receipt_header", value: "Fiderza Desarrollos S.A. - Recibo de Pago" },
    { key: "receipt_footer", value: "Este recibo no reemplaza la factura oficial." },
    { key: "default_exchange_source", value: "blue_sell" },
    { key: "company_phone", value: "341-420-5500" },
    { key: "company_address", value: "Bv. Oroño 1234, Piso 5, Rosario, Santa Fe" },
    { key: "company_email", value: "info@fiderza.com.ar" },
  ];
  await prisma.systemConfig.createMany({
    data: configs.map((c) => ({ id: cuid(), ...c })),
  });
  console.log(`   ${configs.length} configs.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 3. DESARROLLOS (5 — 4 con lotes + 1 oficina)
  // ════════════════════════════════════════════════════════════════════════
  console.log("🏘️  Creando desarrollos...");

  interface DevConfig {
    id: string;
    name: string;
    slug: string;
    description: string;
    location: string;
    type: "INMOBILIARIO" | "OTROS";
    status: "EN_CURSO" | "PLANIFICACION" | "FINALIZADO" | "PAUSADO";
    blocks: string[];
    lotsPerBlock: number;
    basePrice: number;
    areaMin: number;
    areaMax: number;
  }

  const devConfigs: DevConfig[] = [
    {
      id: cuid(), name: "Raíces de Alvear", slug: "raices-de-alvear",
      description: "Barrio abierto residencial en Gral. Alvear, con servicios completos. 160 lotes distribuidos en 16 manzanas.",
      location: "General Alvear, Santa Fe", type: "INMOBILIARIO", status: "EN_CURSO",
      blocks: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"],
      lotsPerBlock: 10, basePrice: 22000, areaMin: 300, areaMax: 700,
    },
    {
      id: cuid(), name: "Potus de Avellaneda", slug: "potus-de-avellaneda",
      description: "Loteo premium sobre Ruta 21 con vista al río. 120 lotes en 12 manzanas. Zona de alta valorización.",
      location: "Avellaneda, Santa Fe", type: "INMOBILIARIO", status: "EN_CURSO",
      blocks: ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"],
      lotsPerBlock: 10, basePrice: 30000, areaMin: 400, areaMax: 900,
    },
    {
      id: cuid(), name: "Terrazas del Sur", slug: "terrazas-del-sur",
      description: "Desarrollo suburbano en zona sur. 150 lotes en 15 manzanas con club house y pileta.",
      location: "Arroyo Seco, Santa Fe", type: "INMOBILIARIO", status: "EN_CURSO",
      blocks: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12", "T13", "T14", "T15"],
      lotsPerBlock: 10, basePrice: 18000, areaMin: 280, areaMax: 600,
    },
    {
      id: cuid(), name: "Altos de Casilda", slug: "altos-de-casilda",
      description: "Nuevo emprendimiento en la ciudad de Casilda. 200 lotes en 20 manzanas, ideal inversión.",
      location: "Casilda, Santa Fe", type: "INMOBILIARIO", status: "EN_CURSO",
      blocks: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15", "C16", "C17", "C18", "C19", "C20"],
      lotsPerBlock: 10, basePrice: 15000, areaMin: 250, areaMax: 550,
    },
    {
      id: cuid(), name: "Fiderza Oficina Central", slug: "fiderza-oficina",
      description: "Centro de costos de la oficina central. No tiene lotes asociados.",
      location: "Rosario, Santa Fe", type: "INMOBILIARIO", status: "EN_CURSO",
      blocks: [], lotsPerBlock: 0, basePrice: 0, areaMin: 0, areaMax: 0,
    },
  ];

  for (const dev of devConfigs) {
    await prisma.development.create({
      data: {
        id: dev.id, name: dev.name, slug: dev.slug,
        description: dev.description, location: dev.location,
        type: dev.type, status: dev.status,
      },
    });
  }
  const fIderzaId = devConfigs[4].id;
  console.log(`   ${devConfigs.length} desarrollos.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 4. LOTES (~630 total)
  // ════════════════════════════════════════════════════════════════════════
  console.log("📐 Creando lotes...");

  interface LotInfo {
    id: string;
    developmentId: string;
    lotNumber: string;
    block: string;
    area: number;
    listPrice: number;
    devName: string;
  }

  const allLots: LotInfo[] = [];

  for (const dev of devConfigs) {
    if (dev.blocks.length === 0) continue;
    for (const block of dev.blocks) {
      for (let i = 1; i <= dev.lotsPerBlock; i++) {
        const lotNum = `${block}-${String(i).padStart(2, "0")}`;
        const area = randomDecimal(dev.areaMin, dev.areaMax, 2);
        const priceMultiplier = 0.8 + (area / dev.areaMax) * 0.4;
        const cornerBonus = i === 1 || i === dev.lotsPerBlock ? 1.15 : 1.0;
        const listPrice = Math.round(dev.basePrice * priceMultiplier * cornerBonus);

        allLots.push({
          id: cuid(), developmentId: dev.id, lotNumber: lotNum,
          block, area, listPrice, devName: dev.name,
        });
      }
    }
  }

  await batchCreate(prisma.lot, allLots.map((l) => ({
    id: l.id, developmentId: l.developmentId, lotNumber: l.lotNumber,
    block: l.block, area: l.area, listPrice: l.listPrice, status: "DISPONIBLE" as const,
  })));
  console.log(`   ${allLots.length} lotes creados.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 5. TAGS
  // ════════════════════════════════════════════════════════════════════════
  console.log("🏷️  Creando tags...");
  const tagsData = [
    { name: "esquina", label: "Esquina", color: "#EF4444" },
    { name: "sobre-ruta", label: "Sobre Ruta", color: "#F59E0B" },
    { name: "vista-al-rio", label: "Vista al Río", color: "#3B82F6" },
    { name: "comercial", label: "Comercial", color: "#8B5CF6" },
    { name: "doble-frente", label: "Doble Frente", color: "#10B981" },
    { name: "escriturado", label: "Escriturado", color: "#6366F1" },
    { name: "promo-lanzamiento", label: "Promo Lanzamiento", color: "#EC4899" },
    { name: "reservado-interno", label: "Reservado Interno", color: "#6B7280" },
  ];

  const tagIds: Record<string, string> = {};
  for (const t of tagsData) {
    const id = cuid();
    tagIds[t.name] = id;
  }
  await prisma.tag.createMany({
    data: tagsData.map((t) => ({ id: tagIds[t.name], ...t })),
  });

  // Assign tags to corner/special lots
  const lotTagsData: Array<{ id: string; lotId: string; tagId: string }> = [];
  for (const lot of allLots) {
    const num = parseInt(lot.lotNumber.split("-")[1]);
    if (num === 1 || num === 10)
      lotTagsData.push({ id: cuid(), lotId: lot.id, tagId: tagIds["esquina"] });
    if (lot.block.startsWith("M1") || lot.block === "A")
      if (Math.random() < 0.3)
        lotTagsData.push({ id: cuid(), lotId: lot.id, tagId: tagIds["sobre-ruta"] });
    if (lot.block.startsWith("M3") || lot.block.startsWith("M4"))
      if (Math.random() < 0.4)
        lotTagsData.push({ id: cuid(), lotId: lot.id, tagId: tagIds["vista-al-rio"] });
    if (Math.random() < 0.05)
      lotTagsData.push({ id: cuid(), lotId: lot.id, tagId: tagIds["comercial"] });
  }
  await batchCreate(prisma.lotTag, lotTagsData);
  console.log(`   ${tagsData.length} tags, ${lotTagsData.length} asignaciones.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 6. PERSONAS (320+)
  // ════════════════════════════════════════════════════════════════════════
  console.log("👥 Creando personas...");

  interface PersonInfo {
    id: string;
    type: "CLIENTE" | "PROVEEDOR" | "AMBOS";
    firstName: string;
    lastName: string;
  }
  const persons: PersonInfo[] = [];
  const usedDNIs = new Set<string>();

  // 300 Clientes
  const personCreateData: Array<Record<string, unknown>> = [];
  for (let i = 0; i < 300; i++) {
    const isFemale = Math.random() > 0.5;
    const firstName = pickRandom(isFemale ? FIRST_NAMES_F : FIRST_NAMES_M);
    const lastName = pickRandom(LAST_NAMES);
    let dni = generateDNI();
    while (usedDNIs.has(dni)) dni = generateDNI();
    usedDNIs.add(dni);
    const cuitVal = generateCUIT(dni);
    const id = cuid();
    persons.push({ id, type: "CLIENTE", firstName, lastName });

    const emailName = firstName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const emailLast = lastName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    personCreateData.push({
      id, type: "CLIENTE", firstName, lastName, dni, cuit: cuitVal,
      email: `${emailName}.${emailLast}${i}@email.com`,
      phone: `341-${randomBetween(400, 499)}-${String(randomBetween(1000, 9999))}`,
      address: `${pickRandom(STREETS)} ${randomBetween(100, 4000)}`,
      city: pickRandom(CITIES_SF), province: "Santa Fe",
      isActive: i < 295, // 5 inactive clients
      createdById: pickRandom(allStaffIds),
    });
  }

  // 15 Proveedores
  for (let i = 0; i < 15; i++) {
    const comp = PROVIDER_TYPES[i % PROVIDER_TYPES.length];
    const firstName = pickRandom(FIRST_NAMES_M);
    const lastName = pickRandom(LAST_NAMES);
    let dni = generateDNI();
    while (usedDNIs.has(dni)) dni = generateDNI();
    usedDNIs.add(dni);
    const cuitVal = generateCUIT(dni);
    const id = cuid();
    persons.push({ id, type: "PROVEEDOR", firstName: `${firstName} (${comp.name})`, lastName });

    personCreateData.push({
      id, type: "PROVEEDOR", firstName: `${firstName} (${comp.name})`, lastName, dni, cuit: cuitVal,
      phone: `341-${randomBetween(500, 599)}-${String(randomBetween(1000, 9999))}`,
      address: `${pickRandom(STREETS)} ${randomBetween(100, 4000)}`,
      city: "Rosario", province: "Santa Fe",
      notes: `Proveedor de ${comp.service}`, isActive: true,
      createdById: adminId,
    });
  }

  // 5 Ambos
  for (let i = 0; i < 5; i++) {
    const firstName = pickRandom(FIRST_NAMES_M);
    const lastName = pickRandom(LAST_NAMES);
    let dni = generateDNI();
    while (usedDNIs.has(dni)) dni = generateDNI();
    usedDNIs.add(dni);
    const cuitVal = generateCUIT(dni);
    const id = cuid();
    persons.push({ id, type: "AMBOS", firstName, lastName });

    personCreateData.push({
      id, type: "AMBOS", firstName, lastName, dni, cuit: cuitVal,
      phone: `341-${randomBetween(600, 699)}-${String(randomBetween(1000, 9999))}`,
      address: `${pickRandom(STREETS)} ${randomBetween(100, 4000)}`,
      city: pickRandom(CITIES_SF), province: "Santa Fe",
      notes: "Cliente y proveedor de servicios", isActive: true,
      createdById: adminId,
    });
  }

  // @ts-expect-error batch creation
  await batchCreate(prisma.person, personCreateData);
  const clientes = persons.filter((p) => p.type === "CLIENTE");
  const proveedores = persons.filter((p) => p.type === "PROVEEDOR" || p.type === "AMBOS");
  console.log(`   ${persons.length} personas (${clientes.length} clientes, ${proveedores.length} proveedores/ambos).\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 7. EXCHANGE RATES — Históricos ficticios + HOY desde dolarapi.com
  // ════════════════════════════════════════════════════════════════════════
  console.log("💱 Generando cotizaciones diarias...");

  // Fetch today's REAL rate from dolarapi.com
  let realRate: {
    officialBuy: number | null; officialSell: number | null;
    blueBuy: number | null; blueSell: number | null;
    cryptoBuy: number | null; cryptoSell: number | null;
  } | null = null;

  try {
    console.log("   Consultando dolarapi.com...");
    const resp = await fetch("https://dolarapi.com/v1/dolares");
    if (resp.ok) {
      const rates: Array<{ casa: string; compra: number; venta: number }> = await resp.json();
      const oficial = rates.find((r) => r.casa === "oficial");
      const blue = rates.find((r) => r.casa === "blue");
      const cripto = rates.find((r) => r.casa === "cripto");
      realRate = {
        officialBuy: oficial?.compra ?? null,
        officialSell: oficial?.venta ?? null,
        blueBuy: blue?.compra ?? null,
        blueSell: blue?.venta ?? null,
        cryptoBuy: cripto?.compra ?? null,
        cryptoSell: cripto?.venta ?? null,
      };
      console.log(`   API OK — Blue: $${realRate.blueBuy}/$${realRate.blueSell}`);
    } else {
      console.log("   API no disponible, usando datos estimados.");
    }
  } catch {
    console.log("   Error al consultar API, usando datos estimados.");
  }

  // Use real blue sell as anchor for generating historical data
  const todayBlueSell = realRate?.blueSell ?? 1300;

  const rateStart = dateAt(2025, 3, 1);
  // Stop generating fake rates 7 days before today — the app auto-fetches from API
  const today = new Date();
  const rateEnd = addDays(today, -7);
  const exchangeRates: Array<{ id: string; date: Date }> = [];
  const rateCreateData: Array<Record<string, unknown>> = [];

  // Calculate realistic drift: from ~70% of current blue a year ago → current blue
  const startBlue = todayBlueSell * 0.72; // Roughly 28% annual increase
  const totalDays = Math.round((rateEnd.getTime() - rateStart.getTime()) / 86400000);
  const dailyDrift = (todayBlueSell - startBlue) / Math.max(totalDays, 1);
  let blueBase = startBlue;
  let curDate = new Date(rateStart);

  while (curDate <= rateEnd) {
    const volatility = (Math.random() - 0.5) * 30;
    blueBase += dailyDrift + volatility * 0.3;
    if (Math.random() < 0.02) blueBase += randomBetween(15, 50);
    blueBase = Math.max(blueBase, startBlue * 0.9); // floor

    const blueSell = Math.round(blueBase * 100) / 100;
    const blueBuy = Math.round((blueSell - randomBetween(10, 25)) * 100) / 100;
    const officialSell = Math.round(blueSell * 0.72 * 100) / 100;
    const officialBuy = Math.round((officialSell - randomBetween(3, 8)) * 100) / 100;
    const cryptoSell = Math.round((blueSell * 1.02 + randomBetween(-5, 10)) * 100) / 100;
    const cryptoBuy = Math.round((cryptoSell - randomBetween(8, 20)) * 100) / 100;

    const id = cuid();
    const dateVal = new Date(curDate);
    exchangeRates.push({ id, date: dateVal });

    rateCreateData.push({
      id, date: dateVal, source: "dolarapi",
      officialBuy, officialSell, blueBuy, blueSell, cryptoBuy, cryptoSell,
    });

    curDate = addDays(curDate, 1);
  }

  // Insert today's REAL rate from API (if available)
  if (realRate) {
    const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const id = cuid();
    exchangeRates.push({ id, date: todayDate });
    rateCreateData.push({
      id, date: todayDate, source: "dolarapi",
      ...realRate,
    });
    console.log("   Cotización de hoy insertada desde API real.");
  }

  // @ts-expect-error batch
  await batchCreate(prisma.exchangeRate, rateCreateData, 100);
  console.log(`   ${exchangeRates.length} cotizaciones (${exchangeRates.length - (realRate ? 1 : 0)} históricas + ${realRate ? "1 real de hoy" : "0 reales"}).\n`);

  function findRateForDate(date: Date): { id: string; date: Date } {
    const target = date.getTime();
    let best = exchangeRates[0];
    let bestDiff = Math.abs(best.date.getTime() - target);
    // Binary-ish search
    for (let i = 0; i < exchangeRates.length; i += 5) {
      const diff = Math.abs(exchangeRates[i].date.getTime() - target);
      if (diff < bestDiff) { bestDiff = diff; best = exchangeRates[i]; }
    }
    return best;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 8. VENTAS (450+) + CUOTAS + REFUERZOS
  // ════════════════════════════════════════════════════════════════════════
  console.log("📝 Creando 460 ventas con planes de pago...");

  // Pick 460 lots to sell
  const lotsForSale = pickRandomN(allLots, 460);

  // Distribution of sales across months
  const monthDist = [
    { m: 3, y: 2025, n: 35 }, { m: 4, y: 2025, n: 38 }, { m: 5, y: 2025, n: 42 },
    { m: 6, y: 2025, n: 40 }, { m: 7, y: 2025, n: 30 }, { m: 8, y: 2025, n: 35 },
    { m: 9, y: 2025, n: 45 }, { m: 10, y: 2025, n: 42 }, { m: 11, y: 2025, n: 48 },
    { m: 12, y: 2025, n: 35 }, { m: 1, y: 2026, n: 40 }, { m: 2, y: 2026, n: 30 },
  ];

  interface SaleInfo {
    id: string; lotId: string; personId: string; saleDate: Date;
    totalPrice: number; totalInstallments: number; status: string;
    developmentId: string; sellerId: string | null; lotNumber: string;
  }
  const salesInfo: SaleInfo[] = [];

  // All installment and extra charge data to batch insert
  const allInstallmentData: Array<Record<string, unknown>> = [];
  const allExtraChargeData: Array<Record<string, unknown>> = [];

  // Track installments for cash movements later
  interface PaidInstInfo {
    id: string; saleId: string; personId: string; devId: string;
    lotNumber: string; number: number; paidAmount: number; paidDate: Date;
  }
  const paidInstallments: PaidInstInfo[] = [];

  // Track paid extra charges
  interface PaidExtraInfo {
    id: string; saleId: string; personId: string; devId: string;
    lotNumber: string; desc: string; amount: number; paidDate: Date;
  }
  const paidExtras: PaidExtraInfo[] = [];

  let lotIdx = 0;
  let clientIdx = 0;
  const saleCreateData: Array<Record<string, unknown>> = [];
  const lotUpdates: Array<{ id: string; status: string }> = [];

  const now = dateAt(2026, 2, 27);

  for (const period of monthDist) {
    for (let s = 0; s < period.n && lotIdx < lotsForSale.length; s++) {
      const lot = lotsForSale[lotIdx++];
      const client = clientes[clientIdx % clientes.length];
      clientIdx++;

      const saleDay = randomBetween(1, 28);
      const saleDate = dateAt(period.y, period.m, saleDay);
      const seller = Math.random() > 0.25 ? pickRandom(sellerUsers) : null;

      // Determine sale type
      let status: string;
      let totalInstallments: number;
      const roll = Math.random();

      if (roll < 0.07) {
        status = "CONTADO"; totalInstallments = 0;
      } else if (roll < 0.10) {
        status = "CESION"; totalInstallments = 0;
      } else if (roll < 0.13) {
        status = "CANCELADA"; totalInstallments = pickRandom([12, 24, 36]);
      } else if (roll < 0.22) {
        status = "COMPLETADA"; totalInstallments = 12;
      } else {
        status = "ACTIVA"; totalInstallments = pickRandom([12, 24, 36, 48, 60]);
      }

      const personId = status === "CESION" ? pickRandom(proveedores).id : client.id;

      let totalPrice = lot.listPrice;
      let downPayment: number | null = null;

      if (status === "CESION") {
        totalPrice = 0;
      } else if (status === "CONTADO") {
        totalPrice = Math.round(lot.listPrice * 0.95);
      } else if (Math.random() > 0.4) {
        downPayment = Math.round(totalPrice * randomDecimal(0.1, 0.3, 2));
      }

      const regularAmount = totalInstallments > 0
        ? Math.round(((totalPrice - (downPayment || 0)) / totalInstallments) * 100) / 100
        : null;

      const firstInstMonth = totalInstallments > 0
        ? `${period.m + 1 > 12 ? period.y + 1 : period.y}-${String(period.m + 1 > 12 ? 1 : period.m + 1).padStart(2, "0")}`
        : null;

      const collDay = totalInstallments > 0 ? pickRandom([1, 5, 10, 15, 20]) : null;

      const commAmount = seller && totalPrice > 0
        ? Math.round(totalPrice * (Number(seller.commissionRate || 3) / 100) * 100) / 100
        : null;

      const saleId = cuid();
      const lotNumber = lot.lotNumber;

      saleCreateData.push({
        id: saleId, lotId: lot.id, personId, sellerId: seller?.id || null,
        saleDate, totalPrice, downPayment, currency: "USD",
        totalInstallments, firstInstallmentAmount: regularAmount,
        regularInstallmentAmount: regularAmount, firstInstallmentMonth: firstInstMonth,
        collectionDay: collDay, commissionAmount: commAmount, status,
        notes: status === "CESION"
          ? `Permuta por servicios de ${pickRandom(PROVIDER_TYPES).service}`
          : status === "CONTADO"
            ? "Pago al contado con descuento del 5%"
            : downPayment ? `Entrega inicial de USD ${downPayment}` : null,
        paymentWindow: totalInstallments > 0
          ? `del ${collDay} al ${Math.min((collDay || 1) + 15, 28)}`
          : null,
        createdById: pickRandom(allStaffIds),
      });

      const lotStatus = status === "CONTADO" ? "CONTADO"
        : status === "CESION" ? "PERMUTA"
        : status === "CANCELADA" ? "DISPONIBLE"
        : status === "COMPLETADA" ? "ESCRITURADO"
        : "VENDIDO";
      lotUpdates.push({ id: lot.id, status: lotStatus });

      salesInfo.push({
        id: saleId, lotId: lot.id, personId, saleDate, totalPrice,
        totalInstallments, status, developmentId: lot.developmentId,
        sellerId: seller?.id || null, lotNumber,
      });

      // Generate installments
      if (totalInstallments > 0 && status !== "CANCELADA") {
        const instStartMonth = period.m + 1 > 12 ? 1 : period.m + 1;
        const instStartYear = period.m + 1 > 12 ? period.y + 1 : period.y;
        const monthsSinceSale = Math.max(0,
          (now.getFullYear() - instStartYear) * 12 +
          (now.getMonth() - (instStartMonth - 1))
        );

        for (let inst = 1; inst <= totalInstallments; inst++) {
          const dueMonth = instStartMonth + (inst - 1);
          const dueYear = instStartYear + Math.floor((dueMonth - 1) / 12);
          const dueMonthNorm = ((dueMonth - 1) % 12) + 1;
          const day = Math.min(collDay || 10, 28);
          const dueDate = dateAt(dueYear, dueMonthNorm, day);

          let instStatus: string;
          let paidAmount = 0;
          let paidDate: Date | null = null;

          if (status === "COMPLETADA") {
            instStatus = "PAGADA";
            paidAmount = regularAmount!;
            paidDate = addDays(dueDate, randomBetween(-5, 10));
          } else if (inst <= monthsSinceSale) {
            if (Math.random() < 0.82) {
              instStatus = "PAGADA";
              paidAmount = regularAmount!;
              paidDate = addDays(dueDate, randomBetween(-3, 7));
            } else if (Math.random() < 0.5) {
              instStatus = "PARCIAL";
              paidAmount = Math.round(regularAmount! * randomDecimal(0.3, 0.7, 2) * 100) / 100;
              paidDate = addDays(dueDate, randomBetween(0, 15));
            } else {
              instStatus = "VENCIDA";
            }
          } else {
            instStatus = "PENDIENTE";
          }

          const instId = cuid();
          allInstallmentData.push({
            id: instId, saleId, installmentNumber: inst, amount: regularAmount!,
            currency: "USD", dueDate, monthLabel: formatMonthLabel(dueDate),
            status: instStatus, paidAmount,
            paidInCurrency: paidAmount > 0 ? "USD" : null, paidDate,
          });

          if (paidAmount > 0 && paidDate) {
            paidInstallments.push({
              id: instId, saleId, personId, devId: lot.developmentId,
              lotNumber, number: inst, paidAmount, paidDate,
            });
          }
        }
      }

      // Extra charges (refuerzos) for ~30% of long-term sales
      if (
        totalInstallments >= 24 &&
        (status === "ACTIVA" || status === "COMPLETADA") &&
        Math.random() < 0.30
      ) {
        const numRef = randomBetween(1, 3);
        for (let r = 0; r < numRef; r++) {
          const refMonths = randomBetween(6, 18);
          const refDue = addMonths(saleDate, refMonths);
          const refAmount = Math.round(totalPrice * randomDecimal(0.05, 0.12, 2));
          const isPast = refDue < now;
          const refStatus = isPast ? (Math.random() < 0.7 ? "PAGADA" : "VENCIDA") : "PENDIENTE";
          const ecId = cuid();
          const desc = `Refuerzo ${r + 1} - ${formatMonthLabel(refDue)}`;

          allExtraChargeData.push({
            id: ecId, saleId, description: desc,
            amount: refAmount, currency: "USD", dueDate: refDue,
            status: refStatus, paidAmount: refStatus === "PAGADA" ? refAmount : 0,
            paidDate: refStatus === "PAGADA" ? addDays(refDue, randomBetween(-2, 5)) : null,
            notified: isPast, createdById: pickRandom(allStaffIds),
          });

          if (refStatus === "PAGADA") {
            paidExtras.push({
              id: ecId, saleId, personId, devId: lot.developmentId,
              lotNumber, desc, amount: refAmount,
              paidDate: addDays(refDue, randomBetween(-2, 5)),
            });
          }
        }
      }
    }
  }

  // Batch insert sales
  // @ts-expect-error batch
  await batchCreate(prisma.sale, saleCreateData, 100);

  // Batch update lot statuses
  for (const lu of lotUpdates) {
    await prisma.lot.update({ where: { id: lu.id }, data: { status: lu.status as never } });
  }

  // Batch insert installments
  // @ts-expect-error batch
  await batchCreate(prisma.installment, allInstallmentData, 500);

  // Batch insert extra charges
  // @ts-expect-error batch
  await batchCreate(prisma.extraCharge, allExtraChargeData, 200);

  const totalInstCount = allInstallmentData.length;
  const totalECCount = allExtraChargeData.length;
  console.log(`   ${salesInfo.length} ventas, ${totalInstCount} cuotas, ${totalECCount} refuerzos.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 9. CASH MOVEMENTS
  // ════════════════════════════════════════════════════════════════════════
  console.log("💰 Generando movimientos de caja...");
  const cmData: Array<Record<string, unknown>> = [];

  // 9a. Cuota payments
  for (const pi of paidInstallments) {
    const rate = findRateForDate(pi.paidDate);
    cmData.push({
      id: cuid(), developmentId: pi.devId, personId: pi.personId,
      saleId: pi.saleId, installmentId: pi.id, exchangeRateId: rate.id,
      date: pi.paidDate, type: "CUOTA",
      concept: `CUOTA ${pi.number} - Lote ${pi.lotNumber}`,
      usdIncome: pi.paidAmount, registeredById: pickRandom(allStaffIds),
    });
  }

  // 9b. Contado payments (ENTREGA)
  for (const sale of salesInfo) {
    if (sale.status === "CONTADO" && sale.totalPrice > 0) {
      const rate = findRateForDate(sale.saleDate);
      cmData.push({
        id: cuid(), developmentId: sale.developmentId, personId: sale.personId,
        saleId: sale.id, exchangeRateId: rate.id,
        date: sale.saleDate, type: "ENTREGA",
        concept: `CONTADO - Lote ${sale.lotNumber}`,
        usdIncome: sale.totalPrice, registeredById: pickRandom(allStaffIds),
      });
    }
  }

  // 9c. Extra charge payments
  for (const pe of paidExtras) {
    const rate = findRateForDate(pe.paidDate);
    cmData.push({
      id: cuid(), developmentId: pe.devId, personId: pe.personId,
      saleId: pe.saleId, extraChargeId: pe.id, exchangeRateId: rate.id,
      date: pe.paidDate, type: "CUOTA",
      concept: `${pe.desc} - Lote ${pe.lotNumber}`,
      usdIncome: pe.amount, registeredById: pickRandom(allStaffIds),
    });
  }

  // 9d. Commissions
  for (const sale of salesInfo) {
    if (sale.sellerId && sale.totalPrice > 0 && sale.status !== "CANCELADA" && sale.status !== "CESION") {
      const seller = users.find((u) => u.id === sale.sellerId);
      if (seller) {
        const commAmt = Math.round(sale.totalPrice * (Number(seller.commissionRate || 3) / 100) * 100) / 100;
        const commDate = addDays(sale.saleDate, randomBetween(15, 45));
        if (commDate < now) {
          cmData.push({
            id: cuid(), developmentId: sale.developmentId,
            date: commDate, type: "COMISION",
            concept: `COMISIÓN ${seller.name} ${seller.lastName} - Lote ${sale.lotNumber}`,
            usdExpense: commAmt, registeredById: adminId,
          });
        }
      }
    }
  }

  // 9e. Monthly recurring: sueldos, alquiler, gastos oficina, contable
  for (let m = 3; m <= 14; m++) {
    const year = m <= 12 ? 2025 : 2026;
    const month = m <= 12 ? m : m - 12;
    const payDate = dateAt(year, month, randomBetween(1, 5));
    const rate = findRateForDate(payDate);
    const ml = formatMonthLabel(payDate);

    // Sueldos
    const sueldos = [
      { name: "Marcelo (Socio)", ars: randomBetween(900000, 1400000) },
      { name: "Secretaria Admin", ars: randomBetween(500000, 700000) },
      { name: "Asistente Comercial 1", ars: randomBetween(450000, 600000) },
      { name: "Asistente Comercial 2", ars: randomBetween(420000, 580000) },
      { name: "Encargado Mantenimiento", ars: randomBetween(380000, 520000) },
      { name: "Community Manager", ars: randomBetween(350000, 480000) },
    ];
    for (const s of sueldos) {
      cmData.push({
        id: cuid(), developmentId: fIderzaId, date: payDate, type: "SUELDO",
        concept: `SUELDO ${s.name} - ${ml}`,
        arsExpense: s.ars, exchangeRateId: rate.id,
        registeredById: adminId,
      });
    }

    // Alquiler
    cmData.push({
      id: cuid(), developmentId: fIderzaId, date: dateAt(year, month, 1),
      type: "ALQUILER", concept: `ALQUILER OFICINA - ${ml}`,
      arsExpense: randomBetween(300000, 420000), registeredById: adminId,
    });

    // Gastos oficina
    const gastosOficina = [
      { c: "Electricidad oficina", ars: randomBetween(25000, 50000) },
      { c: "Internet + Teléfono", ars: randomBetween(20000, 35000) },
      { c: "Limpieza oficina", ars: randomBetween(40000, 65000) },
      { c: "Insumos y papelería", ars: randomBetween(10000, 30000) },
      { c: "Agua y saneamiento", ars: randomBetween(8000, 18000) },
    ];
    for (const g of gastosOficina) {
      cmData.push({
        id: cuid(), developmentId: fIderzaId,
        date: dateAt(year, month, randomBetween(5, 25)),
        type: "GASTO_OFICINA", concept: `${g.c} - ${ml}`,
        arsExpense: g.ars, registeredById: pickRandom(allStaffIds),
      });
    }

    // Contable
    cmData.push({
      id: cuid(), developmentId: fIderzaId,
      date: dateAt(year, month, randomBetween(10, 20)),
      type: "CONTABLE", concept: `HONORARIOS ESTUDIO CONTABLE - ${ml}`,
      arsExpense: randomBetween(130000, 220000), registeredById: adminId,
    });

    // Impuestos trimestrales
    if (month % 3 === 0) {
      cmData.push({
        id: cuid(), developmentId: fIderzaId,
        date: dateAt(year, month, 15), type: "IMPUESTO",
        concept: `IIBB Trimestral Q${Math.ceil(month / 3)} ${year}`,
        arsExpense: randomBetween(180000, 400000), registeredById: adminId,
      });
    }
  }

  // 9f. Project expenses (per development, per month)
  const projectExpensesList = [
    "Corta pasto", "Agrimensor", "Movimiento de suelos", "Tendido eléctrico",
    "Red de agua", "Señalización", "Apertura de calles", "Render actualizado",
    "Cerco perimetral", "Alumbrado", "Cartel de obra", "Estudio ambiental",
    "Gas natural conexión", "Veredas y cordón cuneta", "Forestación",
  ];
  for (const dev of devConfigs.slice(0, 4)) {
    for (let m = 3; m <= 14; m++) {
      const year = m <= 12 ? 2025 : 2026;
      const month = m <= 12 ? m : m - 12;
      const numGastos = randomBetween(2, 5);
      for (let g = 0; g < numGastos; g++) {
        const isUsd = Math.random() < 0.15;
        cmData.push({
          id: cuid(), developmentId: dev.id,
          date: dateAt(year, month, randomBetween(1, 28)),
          type: "GASTO_PROYECTO",
          concept: `${pickRandom(projectExpensesList)} - ${dev.name.split(" ").pop()}`,
          ...(isUsd ? { usdExpense: randomBetween(500, 4000) } : { arsExpense: randomBetween(60000, 600000) }),
          registeredById: pickRandom(allStaffIds),
        });
      }
    }
  }

  // 9g. Marketing
  const marketingItems = [
    "Publicidad Instagram", "Publicidad Facebook", "Diseño flyers",
    "Cartelería ruta", "Stand feria inmobiliaria", "Video drone",
    "Pauta Google Ads", "Radio local", "Brochures", "Merchandising",
    "Evento de lanzamiento", "Sponsoreo local",
  ];
  for (let i = 0; i < 25; i++) {
    const m = randomBetween(3, 14);
    const year = m <= 12 ? 2025 : 2026;
    const month = m <= 12 ? m : m - 12;
    cmData.push({
      id: cuid(), developmentId: pickRandom(devConfigs.slice(0, 4)).id,
      date: dateAt(year, month, randomBetween(1, 28)),
      type: "MARKETING", concept: pickRandom(marketingItems),
      arsExpense: randomBetween(35000, 300000),
      registeredById: pickRandom(allStaffIds),
    });
  }

  // 9h. Currency exchanges
  for (let m = 3; m <= 14; m++) {
    const year = m <= 12 ? 2025 : 2026;
    const month = m <= 12 ? m : m - 12;
    const numCambios = randomBetween(2, 5);
    for (let c = 0; c < numCambios; c++) {
      const cambioDate = dateAt(year, month, randomBetween(1, 28));
      const rate = findRateForDate(cambioDate);
      const usdAmt = randomBetween(500, 8000);
      const arsAmt = Math.round(usdAmt * (1100 + (m - 3) * 30));
      cmData.push({
        id: cuid(), developmentId: fIderzaId, date: cambioDate,
        type: "CAMBIO", concept: `CAMBIO USD ${usdAmt} → ARS`,
        usdExpense: usdAmt, arsIncome: arsAmt,
        exchangeRateId: rate.id, manualRate: Math.round(arsAmt / usdAmt),
        registeredById: adminId,
      });
    }
  }

  // 9i. Retiros
  for (let m = 3; m <= 14; m++) {
    const year = m <= 12 ? 2025 : 2026;
    const month = m <= 12 ? m : m - 12;
    if (Math.random() < 0.75) {
      cmData.push({
        id: cuid(), developmentId: fIderzaId,
        date: dateAt(year, month, randomBetween(15, 28)),
        type: "RETIRO", concept: `RETIRO SOCIO - ${formatMonthLabel(dateAt(year, month, 1))}`,
        usdExpense: randomBetween(1000, 6000), registeredById: adminId,
        notes: "Retiro mensual de utilidades",
      });
    }
  }

  // 9j. Varios
  const variosItems = [
    "Taxi a escribanía", "Almuerzo reunión cliente", "Estacionamiento",
    "Fotocopias escritura", "Sellos notariales", "Encomienda",
    "Café y provisiones", "Reparación impresora", "Uber a banco",
    "Florería cliente", "Ferretería", "Cerrajería", "Peaje ruta",
    "Nafta visita terreno", "Viáticos viaje",
  ];
  for (let i = 0; i < 50; i++) {
    const m = randomBetween(3, 14);
    const year = m <= 12 ? 2025 : 2026;
    const month = m <= 12 ? m : m - 12;
    cmData.push({
      id: cuid(), developmentId: fIderzaId,
      date: dateAt(year, month, randomBetween(1, 28)),
      type: "VARIOS", concept: pickRandom(variosItems),
      arsExpense: randomBetween(3000, 40000),
      registeredById: pickRandom(allStaffIds),
    });
  }

  // 9k. Banco
  for (let m = 3; m <= 14; m++) {
    const year = m <= 12 ? 2025 : 2026;
    const month = m <= 12 ? m : m - 12;
    cmData.push({
      id: cuid(), developmentId: fIderzaId,
      date: dateAt(year, month, randomBetween(1, 15)),
      type: "BANCO", concept: `Extracción bancaria - ${formatMonthLabel(dateAt(year, month, 1))}`,
      arsIncome: randomBetween(500000, 3000000),
      registeredById: adminId, notes: "Extracción para gastos corrientes",
    });
  }

  // 9l. Préstamo
  for (let m = 5; m <= 10; m++) {
    cmData.push({
      id: cuid(), developmentId: fIderzaId, date: dateAt(2025, m, 10),
      type: "PRESTAMO", concept: `Cuota préstamo bancario ${m - 4}/6`,
      arsExpense: 480000, registeredById: adminId,
    });
  }

  // 9m. Fideicomiso
  for (let m = 3; m <= 14; m++) {
    const year = m <= 12 ? 2025 : 2026;
    const month = m <= 12 ? m : m - 12;
    if (Math.random() < 0.45) {
      cmData.push({
        id: cuid(), developmentId: pickRandom(devConfigs.slice(0, 4)).id,
        date: dateAt(year, month, randomBetween(1, 20)),
        type: "FIDEICOMISO", concept: `Pago fideicomiso - ${formatMonthLabel(dateAt(year, month, 1))}`,
        arsExpense: randomBetween(250000, 900000), registeredById: adminId,
      });
    }
  }

  // 9n. Cocheras (ingresos)
  for (let m = 3; m <= 14; m++) {
    const year = m <= 12 ? 2025 : 2026;
    const month = m <= 12 ? m : m - 12;
    if (Math.random() < 0.3) {
      cmData.push({
        id: cuid(), developmentId: fIderzaId,
        date: dateAt(year, month, randomBetween(1, 28)),
        type: "COCHERA", concept: `Alquiler cochera ${randomBetween(1, 5)} - ${formatMonthLabel(dateAt(year, month, 1))}`,
        arsIncome: randomBetween(50000, 120000),
        registeredById: pickRandom(allStaffIds),
      });
    }
  }

  // Batch insert all cash movements
  // @ts-expect-error batch
  await batchCreate(prisma.cashMovement, cmData, 300);
  console.log(`   ${cmData.length} movimientos de caja.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 10. CASH BALANCES
  // ════════════════════════════════════════════════════════════════════════
  console.log("📊 Generando balances mensuales...");
  const balData: Array<Record<string, unknown>> = [];

  for (const dev of devConfigs) {
    let arsRunning = dev.id === fIderzaId ? 2500000 : 500000;
    let usdRunning = dev.id === fIderzaId ? 15000 : 80000;

    for (let m = 3; m <= 14; m++) {
      const year = m <= 12 ? 2025 : 2026;
      const month = m <= 12 ? m : m - 12;
      arsRunning += randomBetween(-300000, 800000);
      if (arsRunning < 0) arsRunning = randomBetween(200000, 600000);
      usdRunning += randomBetween(-5000, 15000);
      if (usdRunning < 0) usdRunning = randomBetween(5000, 25000);

      balData.push({
        id: cuid(), developmentId: dev.id, month, year,
        arsBalance: arsRunning, usdBalance: usdRunning,
        closedAt: m < 14 ? dateAt(year, month, 28) : null,
      });
    }
  }
  // @ts-expect-error batch
  await batchCreate(prisma.cashBalance, balData);
  console.log(`   ${balData.length} balances.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 11. SIGNING SLOTS (40+)
  // ════════════════════════════════════════════════════════════════════════
  console.log("✍️  Creando turnos de firma...");

  const signingTimes = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "16:00"];
  const sigData: Array<Record<string, unknown>> = [];

  const eligibleSales = salesInfo.filter((s) => s.status === "COMPLETADA" || s.status === "ACTIVA");
  for (let i = 0; i < 45 && i < eligibleSales.length; i++) {
    const sale = eligibleSales[i];
    const person = persons.find((p) => p.id === sale.personId);
    const sigMonth = randomBetween(4, 14);
    const sigYear = sigMonth <= 12 ? 2025 : 2026;
    const sigM = sigMonth <= 12 ? sigMonth : sigMonth - 12;
    const sigDate = dateAt(sigYear, sigM, randomBetween(1, 28));

    let sigStatus: string;
    if (sigDate < dateAt(2026, 1, 1)) {
      sigStatus = pickRandom(["COMPLETADA", "COMPLETADA", "COMPLETADA", "CANCELADA"]);
    } else if (sigDate < dateAt(2026, 2, 20)) {
      sigStatus = pickRandom(["CONFIRMADA", "COMPLETADA"]);
    } else {
      sigStatus = pickRandom(["PENDIENTE", "CONFIRMADA"]);
    }

    const time = pickRandom(signingTimes);
    sigData.push({
      id: cuid(), developmentId: sale.developmentId, sellerId: sale.sellerId,
      date: sigDate, time,
      endTime: `${String(parseInt(time.split(":")[0]) + 1).padStart(2, "0")}:${time.split(":")[1]}`,
      lotInfo: `Lote ${sale.lotNumber}`,
      clientName: person ? `${person.firstName} ${person.lastName}` : null,
      lotNumbers: sale.lotNumber, status: sigStatus,
      notes: sigStatus === "CANCELADA" ? "Cancelada por documentación pendiente"
        : sigStatus === "REPROGRAMADA" ? "Reprogramada a pedido del cliente" : null,
      createdById: pickRandom(allStaffIds),
    });
  }
  // @ts-expect-error batch
  await batchCreate(prisma.signingSlot, sigData);
  console.log(`   ${sigData.length} turnos.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 12. MESSAGES (20+)
  // ════════════════════════════════════════════════════════════════════════
  console.log("💬 Creando mensajes...");

  const messageTemplates = [
    { subject: "Cliente interesado en Raíces", body: "Hoy vino un cliente muy interesado en los lotes de la manzana C. Quiere que lo llamemos mañana para coordinar visita." },
    { subject: "Problema documentación", body: "El cliente González no trajo el CUIT. Le pedí que lo traiga mañana para completar la escritura." },
    { subject: "Cotización pendiente", body: "Hay que actualizar la cotización del dólar manualmente hoy, la API no respondió." },
    { subject: "Reunión con escribano", body: "El escribano Pérez confirmó la reunión para el viernes a las 10. Llevar toda la documentación." },
    { subject: "Pago parcial recibido", body: "El cliente Martínez dejó un pago parcial de su cuota. Falta completar USD 200." },
    { subject: "Lote liberado", body: "Se liberó el lote B-05 por cancelación de venta. Ya está disponible." },
    { subject: "Cierre de caja", body: "No olvidar hacer el cierre de caja del mes antes del viernes." },
    { subject: "Visita al terreno", body: "Mañana a las 9 vamos con interesados al loteo Potus. Preparar folletería." },
    { subject: "Actualización precios", body: "Marcelo aprobó el aumento del 8% en los lotes de Raíces a partir del próximo mes." },
    { subject: "Cuotas vencidas", body: "Hay 12 clientes con cuotas vencidas hace más de 30 días. Enviar recordatorios urgente." },
    { subject: "Comisión pendiente", body: "Diego todavía no cobró la comisión de la venta del lote M2-07. Verificar con finanzas." },
    { subject: "Feriado próximo", body: "El lunes es feriado. Los turnos de firma se reprograman al martes." },
    { subject: "Nuevo desarrollo", body: "Arrancamos con Terrazas del Sur la semana que viene. Preparar todo el material comercial." },
    { subject: "Consulta financiera", body: "Un inversor preguntó por compra de 5 lotes juntos en Altos de Casilda. ¿Hacemos precio por volumen?" },
    { subject: "Mantenimiento terrenos", body: "Los lotes de la manzana G necesitan corte de pasto urgente. El pasto está muy alto." },
    { subject: "Error en sistema", body: "Al cargar el pago de la cuota 8 del lote T5-03 me dio error. ¿Pueden revisar?" },
    { subject: "Propuesta proveedor", body: "El agrimensor Suárez mandó presupuesto para la mensura de Altos de Casilda. Está dentro del rango." },
    { subject: "Cliente moroso", body: "El Sr. Pérez tiene 3 cuotas impagas y no contesta el teléfono. ¿Procedemos con carta documento?" },
    { subject: "Evento lanzamiento", body: "Confirmado el evento de lanzamiento de Terrazas del Sur para el sábado 15. Confirmar catering." },
    { subject: "Felicitaciones equipo", body: "Este mes vendimos 48 lotes. Récord absoluto. Felicitaciones a todo el equipo comercial." },
  ];

  const msgCreateData: Array<Record<string, unknown>> = [];
  const msgRecipientData: Array<Record<string, unknown>> = [];

  for (const tmpl of messageTemplates) {
    const sender = pickRandom(users);
    const recipients = pickRandomN(users.filter((u) => u.id !== sender.id), randomBetween(1, 4));
    const msgDate = dateAt(randomBetween(2025, 2026), randomBetween(3, 12), randomBetween(1, 28));
    const msgId = cuid();

    msgCreateData.push({
      id: msgId, senderId: sender.id, subject: tmpl.subject,
      body: tmpl.body, createdAt: msgDate,
    });

    for (const r of recipients) {
      msgRecipientData.push({
        id: cuid(), messageId: msgId, userId: r.id,
        readAt: Math.random() > 0.3 ? addDays(msgDate, randomBetween(0, 3)) : null,
      });
    }
  }

  // @ts-expect-error batch
  await batchCreate(prisma.message, msgCreateData);
  // @ts-expect-error batch
  await batchCreate(prisma.messageRecipient, msgRecipientData);
  console.log(`   ${msgCreateData.length} mensajes.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 13. NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════════════
  console.log("🔔 Creando notificaciones...");
  const notifData: Array<Record<string, unknown>> = [];

  // Overdue installment notifications
  const overdueInsts = allInstallmentData.filter((i) => i.status === "VENCIDA");
  for (const inst of overdueInsts.slice(0, 100)) {
    const targetUsers = pickRandomN(users, 2);
    for (const u of targetUsers) {
      notifData.push({
        id: cuid(), userId: u.id, type: "CUOTA_VENCIDA",
        title: `Cuota ${inst.installmentNumber} vencida`,
        body: `La cuota venció el ${(inst.dueDate as Date).toISOString().split("T")[0]}`,
        referenceType: "Installment", referenceId: inst.id as string,
        read: Math.random() > 0.4,
        createdAt: addDays(inst.dueDate as Date, 1),
      });
    }
  }

  // Payment notifications
  for (const pi of paidInstallments.slice(0, 50)) {
    notifData.push({
      id: cuid(), userId: adminId, type: "PAGO_RECIBIDO",
      title: `Pago recibido - Cuota ${pi.number}`,
      body: `USD ${pi.paidAmount} - Lote ${pi.lotNumber}`,
      referenceType: "Installment", referenceId: pi.id,
      read: true, createdAt: pi.paidDate,
    });
  }

  // System notifications
  const sysNotifs = [
    { title: "Actualización de precios Raíces", body: "Se actualizaron los precios de lista +8%", date: dateAt(2025, 7, 1) },
    { title: "Mantenimiento programado", body: "Sistema en mantenimiento sábado 22-24hs", date: dateAt(2025, 9, 15) },
    { title: "Nuevo desarrollo: Terrazas del Sur", body: "Se habilitó Terrazas del Sur en el sistema", date: dateAt(2025, 5, 10) },
    { title: "Nuevo desarrollo: Altos de Casilda", body: "Se habilitó Altos de Casilda en el sistema", date: dateAt(2025, 6, 1) },
    { title: "Cierre fiscal 2025", body: "Exportar movimientos de caja para cierre fiscal", date: dateAt(2025, 12, 20) },
    { title: "Récord de ventas Noviembre", body: "48 lotes vendidos en noviembre. Récord absoluto.", date: dateAt(2025, 12, 1) },
    { title: "Actualización del sistema", body: "Se agregó funcionalidad de importación CSV/Excel", date: dateAt(2026, 1, 15) },
  ];
  for (const sn of sysNotifs) {
    for (const u of users) {
      notifData.push({
        id: cuid(), userId: u.id, type: "SISTEMA",
        title: sn.title, body: sn.body,
        read: Math.random() > 0.2, createdAt: sn.date,
      });
    }
  }

  // @ts-expect-error batch
  await batchCreate(prisma.notification, notifData, 300);
  console.log(`   ${notifData.length} notificaciones.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 14. AUDIT LOGS
  // ════════════════════════════════════════════════════════════════════════
  console.log("📋 Generando audit logs...");
  const auditData: Array<Record<string, unknown>> = [];

  for (const sale of salesInfo) {
    auditData.push({
      id: cuid(), userId: pickRandom(allStaffIds),
      action: "CREATE", entity: "Sale", entityId: sale.id,
      newData: { totalPrice: sale.totalPrice, status: sale.status, totalInstallments: sale.totalInstallments },
      ipAddress: `192.168.1.${randomBetween(10, 50)}`,
      createdAt: sale.saleDate,
    });
    if (sale.status === "CANCELADA" || sale.status === "COMPLETADA") {
      auditData.push({
        id: cuid(), userId: adminId,
        action: "UPDATE", entity: "Sale", entityId: sale.id,
        oldData: { status: "ACTIVA" }, newData: { status: sale.status },
        ipAddress: `192.168.1.${randomBetween(10, 50)}`,
        createdAt: addDays(sale.saleDate, randomBetween(30, 200)),
      });
    }
  }

  for (const p of persons.slice(0, 80)) {
    auditData.push({
      id: cuid(), userId: pickRandom(allStaffIds),
      action: "CREATE", entity: "Person", entityId: p.id,
      newData: { type: p.type, name: `${p.firstName} ${p.lastName}` },
      ipAddress: `192.168.1.${randomBetween(10, 50)}`,
      createdAt: dateAt(2025, randomBetween(3, 12), randomBetween(1, 28)),
    });
  }

  for (const dev of devConfigs.slice(0, 4)) {
    auditData.push({
      id: cuid(), userId: adminId,
      action: "UPDATE", entity: "Development", entityId: dev.id,
      oldData: { status: "PLANIFICACION" }, newData: { status: "EN_CURSO" },
      ipAddress: "192.168.1.10", createdAt: dateAt(2025, 3, 1),
    });
  }

  // @ts-expect-error batch
  await batchCreate(prisma.auditLog, auditData, 300);
  console.log(`   ${auditData.length} registros de auditoría.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // 15. ROLE PERMISSIONS
  // ════════════════════════════════════════════════════════════════════════
  console.log("🔑 Configurando permisos...");
  const perms = [
    ...["sales:*", "persons:*", "lots:*", "developments:*", "cash:*", "users:*", "config:*", "reports:*", "signings:*", "audit:read"]
      .map((p) => ({ role: "SUPER_ADMIN" as const, permission: p })),
    ...["sales:read", "sales:create", "sales:update", "persons:*", "lots:*", "developments:read", "signings:*", "reports:read"]
      .map((p) => ({ role: "ADMINISTRACION" as const, permission: p })),
    ...["sales:read", "cash:*", "reports:*", "persons:read", "lots:read"]
      .map((p) => ({ role: "FINANZAS" as const, permission: p })),
    ...["sales:read", "cash:create", "cash:read", "persons:read", "lots:read", "installments:update"]
      .map((p) => ({ role: "COBRANZA" as const, permission: p })),
  ];
  await prisma.rolePermission.createMany({
    data: perms.map((p) => ({ id: cuid(), ...p })),
  });
  console.log(`   ${perms.length} permisos.\n`);

  // ════════════════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ════════════════════════════════════════════════════════════════════════

  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ SEED COMPLETO — Resumen:");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`   Usuarios:              ${users.length}`);
  console.log(`   Desarrollos:           ${devConfigs.length}`);
  console.log(`   Lotes:                 ${allLots.length}`);
  console.log(`   Tags:                  ${tagsData.length} (${lotTagsData.length} asignaciones)`);
  console.log(`   Personas:              ${persons.length}`);
  console.log(`   Ventas:                ${salesInfo.length}`);
  console.log(`   Cuotas:                ${totalInstCount}`);
  console.log(`   Refuerzos:             ${totalECCount}`);
  console.log(`   Cotizaciones diarias:  ${exchangeRates.length}`);
  console.log(`   Movimientos de caja:   ${cmData.length}`);
  console.log(`   Balances mensuales:    ${balData.length}`);
  console.log(`   Turnos de firma:       ${sigData.length}`);
  console.log(`   Mensajes:              ${msgCreateData.length}`);
  console.log(`   Notificaciones:        ${notifData.length}`);
  console.log(`   Audit logs:            ${auditData.length}`);
  console.log(`   Permisos:              ${perms.length}`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("\n🔑 Login: admin@inmobiliaria.com / Demo2025!");
  console.log("   (Todos los usuarios usan la misma contraseña)\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
