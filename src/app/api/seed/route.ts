import { NextResponse } from "next/server";
import { getDb, isNeonConfigured } from "@/db";
import { clientes, productos, compras, detallesCompra } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isNeonConfigured) {
    return NextResponse.json(
      {
        message: "Neon no está configurado aún con DATABASE_URL. Usando datos demo en memoria.",
        configured: false,
      },
      { status: 200 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "No se pudo conectar a Neon" }, { status: 500 });
  }

  try {
    // Crear tablas si no existen
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS clientes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(255) NOT NULL,
        rif VARCHAR(50),
        email VARCHAR(255) UNIQUE NOT NULL,
        telefono VARCHAR(50),
        empresa VARCHAR(255),
        direccion TEXT,
        notas TEXT,
        creado_en TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rif VARCHAR(50);

      CREATE TABLE IF NOT EXISTS productos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        codigo_sku VARCHAR(100) UNIQUE NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        marca VARCHAR(100),
        descripcion TEXT,
        categoria VARCHAR(100) NOT NULL,
        precio NUMERIC(12,2) NOT NULL,
        stock_actual INTEGER DEFAULT 0 NOT NULL,
        activo BOOLEAN DEFAULT TRUE NOT NULL,
        creado_en TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      ALTER TABLE productos ADD COLUMN IF NOT EXISTS marca VARCHAR(100);

      CREATE TABLE IF NOT EXISTS compras (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        numero_factura VARCHAR(100) UNIQUE NOT NULL,
        fecha_compra TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        total NUMERIC(12,2) NOT NULL,
        estado VARCHAR(50) DEFAULT 'completada' NOT NULL,
        metodo_pago VARCHAR(50) DEFAULT 'transferencia' NOT NULL,
        notas TEXT,
        creado_en TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS detalles_compra (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
        producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
        cantidad INTEGER NOT NULL,
        precio_unitario NUMERIC(12,2) NOT NULL,
        subtotal NUMERIC(12,2) NOT NULL
      );
    `);

    return NextResponse.json({
      success: true,
      message: "Estructura de tablas sincronizada correctamente en Neon PostgreSQL.",
      configured: true,
    });
  } catch (error: any) {
    console.error("Error al sincronizar Neon:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
