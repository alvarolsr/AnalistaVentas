import { NextResponse } from "next/server";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await req.json();
    const estado = body.estado;

    if (!id || !estado) {
      return NextResponse.json(
        { error: "Se requiere el ID de la compra y el nuevo estado" },
        { status: 400 }
      );
    }

    const estadoLimpio = String(estado).toLowerCase().trim();
    if (!["pendiente", "completada", "cancelada"].includes(estadoLimpio)) {
      return NextResponse.json(
        { error: "Estado no válido. Permitidos: 'pendiente' o 'completada'" },
        { status: 400 }
      );
    }

    const compraActualizada = await DataService.updateCompraEstado(id, estadoLimpio);
    if (!compraActualizada) {
      return NextResponse.json({ error: "Compra no encontrada" }, { status: 404 });
    }

    return NextResponse.json(compraActualizada);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar la compra" },
      { status: 500 }
    );
  }
}
