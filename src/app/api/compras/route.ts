import { NextResponse } from "next/server";
import { DataService } from "@/db/service";
import { getDb } from "@/db";
import { productos, clientes } from "@/db/schema";
import { ilike } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const compras = await DataService.getCompras();
    return NextResponse.json(compras, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al obtener compras" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Debe incluir al menos un producto en la compra" }, { status: 400 });
    }

    const db = getDb();
    let finalClienteId = body.clienteId;

    // Si no se proporcionó clienteId existente, o se indicó clienteNuevo / clienteDetectado
    if (!finalClienteId && (body.clienteNuevo || body.cliente || body.clienteNombre)) {
      const info = body.clienteNuevo || body.cliente || {
        nombre: body.clienteNombre,
        rif: body.clienteRif,
        empresa: body.clienteEmpresa,
        direccion: body.clienteDireccion,
        telefono: body.clienteTelefono,
        email: body.clienteEmail,
      };

      const nombreLimpio = String(info.nombre || "").trim();
      const rifLimpio = info.rif || body.rif || body.clienteRif ? String(info.rif || body.rif || body.clienteRif).trim() : null;

      // 1. PRIORIDAD TOTAL: Buscar siempre por RIF normalizado (sin importar guiones, puntos o mayúsculas)
      if (rifLimpio) {
        const clientePorRif = await DataService.getClienteByRif(rifLimpio);
        if (clientePorRif) {
          finalClienteId = clientePorRif.id;

          // Si el cliente existente no tenía dirección o teléfono y en esta compra vienen, enriquecemos la ficha
          const datosActualizar: any = {};
          if (info.telefono && !clientePorRif.telefono) datosActualizar.telefono = info.telefono;
          if (info.direccion && !clientePorRif.direccion) datosActualizar.direccion = info.direccion;
          if (info.empresa && !clientePorRif.empresa) datosActualizar.empresa = info.empresa;
          if (Object.keys(datosActualizar).length > 0) {
            await DataService.updateCliente(clientePorRif.id, datosActualizar);
          }
        }
      }

      // 2. Si no se encontró por RIF (o no venía RIF), buscar por coincidencia de nombre
      if (!finalClienteId && nombreLimpio && db) {
        const encontradosNom = await db
          .select({ id: clientes.id })
          .from(clientes)
          .where(ilike(clientes.nombre, nombreLimpio));
        if (encontradosNom.length > 0) {
          finalClienteId = encontradosNom[0].id;
        }
      }

      // 3. Si no existe en la base de datos, crear el nuevo cliente
      if (!finalClienteId && nombreLimpio) {
        let email = info.email ? String(info.email).trim() : "";
        if (!email) {
          const slugRif = rifLimpio ? rifLimpio.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
          const slugNom = nombreLimpio.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
          const baseSlug = slugRif || slugNom || "cliente";
          email = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}@facturacion.com`;
        }

        const nuevoCliente = await DataService.createCliente({
          nombre: nombreLimpio,
          rif: rifLimpio,
          email,
          empresa: info.empresa ? String(info.empresa).trim() : null,
          direccion: info.direccion ? String(info.direccion).trim() : null,
          telefono: info.telefono ? String(info.telefono).trim() : null,
          limiteCredito: info.limiteCredito ? String(info.limiteCredito) : "0.00",
          notas: info.notas || "Cliente registrado automáticamente al procesar factura",
        });

        finalClienteId = nuevoCliente.id;
      }
    }

    if (!finalClienteId) {
      return NextResponse.json(
        { error: "Debe seleccionar un cliente existente o proporcionar los datos del nuevo cliente." },
        { status: 400 }
      );
    }
    const itemsProcesados: Array<{ productoId: string; cantidad: number; precioUnitario: number }> = [];

    for (const it of body.items) {
      let prodId = it.productoId;

      // Si no viene productoId pero sí codigoSku, buscar en DB o crear
      if (!prodId && it.codigoSku) {
        const skuUpper = String(it.codigoSku).trim().toUpperCase();
        if (db) {
          const encontrados = await db
            .select({ id: productos.id })
            .from(productos)
            .where(ilike(productos.codigoSku, skuUpper));

          if (encontrados.length > 0) {
            prodId = encontrados[0].id;
          }
        }

        // Si todavía no existe, auto-crear el producto
        if (!prodId) {
          const nuevo = await DataService.createProducto({
            codigoSku: skuUpper,
            nombre: it.nombre ? String(it.nombre).trim() : `Producto ${skuUpper}`,
            marca: it.marca ? String(it.marca).trim().toUpperCase() : "LYC",
            categoria: it.categoria ? String(it.categoria).trim() : "REPUESTOS GENERALES",
            precio: (Number(it.precioUnitario) || 0).toFixed(2),
            stockActual: Math.max(0, Number(it.cantidad) || 1),
            activo: true,
          } as any);
          prodId = nuevo.id;
        }
      }

      if (!prodId) {
        return NextResponse.json(
          { error: `El producto '${it.nombre || it.codigoSku || "desconocido"}' no cuenta con un identificador válido.` },
          { status: 400 }
        );
      }

      itemsProcesados.push({
        productoId: prodId,
        cantidad: Math.max(1, Number(it.cantidad) || 1),
        precioUnitario: Math.max(0, Number(it.precioUnitario) || 0),
      });
    }

    const compra = await DataService.createCompra({
      clienteId: finalClienteId,
      numeroFactura: body.numeroFactura,
      metodoPago: body.metodoPago || "transferencia",
      estado: body.estado || "completada",
      notas: body.notas,
      fechaCompra: body.fechaCompra || body.fecha,
      items: itemsProcesados,
    });

    return NextResponse.json(compra, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al registrar la compra" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return NextResponse.json(
        { error: "Se requiere el ID de la compra ('id') y el nuevo estado ('estado')" },
        { status: 400 }
      );
    }

    const estadoLimpio = String(estado).toLowerCase().trim();
    if (!["pendiente", "completada", "cancelada"].includes(estadoLimpio)) {
      return NextResponse.json(
        { error: "Estado no válido. Los estados permitidos son 'pendiente' o 'completada'" },
        { status: 400 }
      );
    }

    const compraActualizada = await DataService.updateCompraEstado(id, estadoLimpio);
    if (!compraActualizada) {
      return NextResponse.json({ error: "No se encontró la compra especificada" }, { status: 404 });
    }

    return NextResponse.json(compraActualizada);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al actualizar el estado de la compra" },
      { status: 500 }
    );
  }
}

