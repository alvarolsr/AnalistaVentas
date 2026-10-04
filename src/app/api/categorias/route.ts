import { NextResponse } from "next/server";
import { DataService } from "@/db/service";

export async function GET() {
  try {
    const arbol = await DataService.getCategoriasArbol();
    return NextResponse.json({
      exito: true,
      categorias: arbol,
    });
  } catch (error: any) {
    console.error("Error al obtener categorías:", error);
    return NextResponse.json(
      { error: "Error interno al obtener categorías", detalle: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nombre, categoriaPadreId, descripcion } = body;

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json(
        { error: "El nombre de la categoría es requerido." },
        { status: 400 }
      );
    }

    const id = await DataService.getOrCreateSubcategoria(nombre, categoriaPadreId);
    return NextResponse.json({
      exito: true,
      id,
      mensaje: "Categoría procesada exitosamente.",
    });
  } catch (error: any) {
    console.error("Error al registrar categoría:", error);
    return NextResponse.json(
      { error: "Error interno al crear categoría", detalle: error?.message },
      { status: 500 }
    );
  }
}
