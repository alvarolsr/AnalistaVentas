import { NextResponse } from "next/server";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const compras = await DataService.getCompras();
    return NextResponse.json(compras);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener compras" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.clienteId || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar un cliente y al menos un producto" }, { status: 400 });
    }

    const compra = await DataService.createCompra({
      clienteId: body.clienteId,
      metodoPago: body.metodoPago || "transferencia",
      estado: body.estado || "completada",
      notas: body.notas,
      items: body.items,
    });

    return NextResponse.json(compra, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al registrar la compra" }, { status: 500 });
  }
}
