import { NextResponse } from "next/server";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientes = await DataService.getClientes();
    return NextResponse.json(clientes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener clientes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.nombre || !body.email) {
      return NextResponse.json({ error: "Nombre y correo son requeridos" }, { status: 400 });
    }

    const nuevoCliente = await DataService.createCliente({
      nombre: body.nombre.trim(),
      email: body.email.trim(),
      telefono: body.telefono ? body.telefono.trim() : null,
      empresa: body.empresa ? body.empresa.trim() : null,
      direccion: body.direccion ? body.direccion.trim() : null,
      notas: body.notas ? body.notas.trim() : null,
    });

    return NextResponse.json(nuevoCliente, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear cliente" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID de cliente requerido" }, { status: 400 });
    }

    await DataService.deleteCliente(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al eliminar cliente" }, { status: 500 });
  }
}
