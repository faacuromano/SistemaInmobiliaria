import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const status: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    status.database = "connected";
  } catch {
    status.database = "disconnected";
    status.status = "degraded";
    return NextResponse.json(status, { status: 503 });
  }

  return NextResponse.json(status);
}
