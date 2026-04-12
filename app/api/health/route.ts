import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { appEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      environment: appEnv.VERCEL_ENV ?? appEnv.NODE_ENV,
      database: "up",
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startedAt,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        environment: appEnv.VERCEL_ENV ?? appEnv.NODE_ENV,
        database: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
