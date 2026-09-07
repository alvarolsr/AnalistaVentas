import { NextResponse } from "next/server";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const productos = await DataService.getProductos();
    return NextResponse.json(productos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.codigoSku || !body.nombre || !body.categoria || body.precio === undefined) {
      return NextResponse.json({ error: "SKU, nombre, categoría y precio son obligatorios" }, { status: 400 });
    }

    const nuevoProducto = await DataService.createProducto({
      codigoSku: body.codigoSku.trim().toUpperCase(),
      nombre: body.nombre.trim(),
      marca: body.marca ? body.marca.trim() : null,
      descripcion: body.descripcion ? body.descripcion.trim() : null,
      categoria: body.categoria.trim(),
      precio: parseFloat(body.precio).toFixed(2),
      stockActual: parseInt(body.stockActual || 0, 10),
      activo: body.activo !== undefined ? Boolean(body.activo) : true,
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear producto" }, { status: 500 });
  }
}
