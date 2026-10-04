import { NextResponse } from "next/server";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productos, categoriaPrincipal } = body;

    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return NextResponse.json(
        { error: "Se requiere un arreglo de productos válido" },
        { status: 400 }
      );
    }

    const formateados = productos.map((p: any, idx: number) => ({
      codigoSku: (p.codigoSku || `SKU-AUTO-${Date.now()}-${idx + 1}`).trim().toUpperCase(),
      nombre: (p.nombre || "Producto sin nombre").trim(),
      marca: p.marca && p.marca.trim() ? p.marca.trim().toUpperCase() : "LYC",
      descripcion: p.descripcion ? p.descripcion.trim() : null,
      categoria: (p.categoria || "General").trim(),
      categoriaPrincipalNombre: p.categoriaPrincipalNombre || (typeof categoriaPrincipal === "string" ? categoriaPrincipal.trim() : null),
      precio: parseFloat(p.precio || 0).toFixed(2),
      stockActual: parseInt(p.stockActual || 0, 10),
      activo: p.activo !== undefined ? Boolean(p.activo) : true,
    }));

    const count = await DataService.createProductosBatch(formateados as any);

    return NextResponse.json({
      success: true,
      importados: count,
      mensaje: `Se han importado ${count} productos correctamente a la base de datos.`,
    });
  } catch (error: any) {
    console.error("Error en batch de productos:", error);
    return NextResponse.json(
      { error: error.message || "Error al importar productos" },
      { status: 500 }
    );
  }
}
