import { NextResponse } from "next/server";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clientes = await DataService.getClientes();
    return NextResponse.json(clientes, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
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
      rif: body.rif ? body.rif.trim().toUpperCase() : null,
      email: body.email.trim(),
      telefono: body.telefono ? body.telefono.trim() : null,
      empresa: body.empresa ? body.empresa.trim() : null,
      direccion: body.direccion ? body.direccion.trim() : null,
      notas: body.notas ? body.notas.trim() : null,
      limiteCredito:
        body.limiteCredito !== undefined && body.limiteCredito !== "" && body.limiteCredito !== null
          ? String(body.limiteCredito)
          : "0.00",
    });

    return NextResponse.json(nuevoCliente, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al crear cliente" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "ID de cliente requerido" }, { status: 400 });
    }

    const { id, ...data } = body;
    const actualizado = await DataService.updateCliente(id, {
      ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
      ...(data.rif !== undefined && { rif: data.rif ? data.rif.trim().toUpperCase() : null }),
      ...(data.email !== undefined && { email: data.email.trim() }),
      ...(data.telefono !== undefined && { telefono: data.telefono ? data.telefono.trim() : null }),
      ...(data.empresa !== undefined && { empresa: data.empresa ? data.empresa.trim() : null }),
      ...(data.direccion !== undefined && { direccion: data.direccion ? data.direccion.trim() : null }),
      ...(data.notas !== undefined && { notas: data.notas ? data.notas.trim() : null }),
      ...(data.limiteCredito !== undefined && {
        limiteCredito:
          data.limiteCredito !== "" && data.limiteCredito !== null ? String(data.limiteCredito) : "0.00",
      }),
    });

    return NextResponse.json(actualizado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al actualizar cliente" }, { status: 500 });
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
