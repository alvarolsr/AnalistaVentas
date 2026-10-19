import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { extraerFacturaConGemini, type FacturaExtraida, type ItemFacturaExtraido } from "./geminiInvoiceAgent";
import { getDb } from "@/db";
import { clientes, productos } from "@/db/schema";
import { ilike, or, inArray, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export interface ItemEnriquecido extends ItemFacturaExtraido {
  enCatalogo: boolean;
  productoId?: string;
  productoNombreDb?: string;
  stockActual?: number;
  precioDb?: number;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    const apiKeyCustom = (formData.get("apiKey") as string | null) || undefined;
    const clienteIdPreseleccionado = (formData.get("clienteId") as string | null) || undefined;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo PDF" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let facturaExtraida: FacturaExtraida | null = null;
    let motorUsado: "gemini" | "heuristico" = "gemini";
    let warningMensaje: string | null = null;

    // 1. Intentar extracción con Agente Gemini
    try {
      facturaExtraida = await extraerFacturaConGemini({
        pdfBuffer: uint8Array,
        fileName: file.name,
        apiKey: apiKeyCustom,
      });
    } catch (errGemini: any) {
      console.warn("[Importar PDF Compras] Error con Gemini, activando fallback heurístico:", errGemini.message);
      motorUsado = "heuristico";
      warningMensaje = `Extracción heurística utilizada (${errGemini.message || "Gemini no disponible"}). Revisa los datos extraídos cuidadosamente.`;
    }

    // 2. Fallback Heurístico si Gemini falló
    if (!facturaExtraida) {
      try {
        const extracted = await extractText(uint8Array);
        const rawText = Array.isArray(extracted.text) ? extracted.text.join("\n") : (extracted.text || "");
        
        if (!rawText || !rawText.trim()) {
          return NextResponse.json(
            { error: "No se detectó texto en el documento PDF. Si es una fotografía o escaneo no OCR, asegúrate de que contenga texto legible." },
            { status: 400 }
          );
        }

        facturaExtraida = extraerFacturaHeuristica(rawText, file.name);
      } catch (errUnpdf: any) {
        return NextResponse.json(
          { error: `Error al leer el archivo PDF: ${errUnpdf.message || "Formato no válido"}` },
          { status: 400 }
        );
      }
    }

    // 3. Enriquecer con Base de Datos
    const db = getDb();
    let clienteSugerido: any = null;
    const itemsEnriquecidos: ItemEnriquecido[] = [];

    if (db) {
      try {
        // A) Buscar cliente sugerido en DB
        if (clienteIdPreseleccionado) {
          const clientRows = await db.select().from(clientes).where(ilike(clientes.id, clienteIdPreseleccionado));
          if (clientRows.length > 0) {
            clienteSugerido = clientRows[0];
          }
        }

        if (!clienteSugerido) {
          const rifExtraido = facturaExtraida.clienteDetectado.rif?.replace(/[^a-zA-Z0-9]/g, "");
          const nombreExtraido = (facturaExtraida.clienteDetectado.nombre || "").trim();

          // 1. Buscar por RIF exacto primero (el RIF debe tener al menos 6 caracteres y no ser genérico)
          if (rifExtraido && rifExtraido.length >= 6) {
            const clientRows = await db
              .select()
              .from(clientes)
              .where(ilike(clientes.rif, `%${rifExtraido}%`));
            if (clientRows.length > 0) {
              clienteSugerido = clientRows[0];
            }
          }

          // 2. Si no por RIF, buscar por coincidencia de nombre precisa
          if (!clienteSugerido && nombreExtraido && nombreExtraido.length >= 4) {
            const cleanName = nombreExtraido
              .replace(/^(c\.a\.?|s\.a\.?|inversiones|comercializadora|distribuidora|repuestos)\s+/i, "")
              .trim();

            if (cleanName.length >= 4) {
              const exactRows = await db
                .select()
                .from(clientes)
                .where(
                  or(
                    ilike(clientes.nombre, `%${cleanName}%`),
                    ilike(clientes.empresa, `%${cleanName}%`)
                  )
                );
              if (exactRows.length === 1) {
                clienteSugerido = exactRows[0];
              } else if (exactRows.length > 1) {
                const exactMatch = exactRows.find(
                  (c) =>
                    c.nombre.toLowerCase().trim() === nombreExtraido.toLowerCase().trim() ||
                    (c.empresa && c.empresa.toLowerCase().trim() === nombreExtraido.toLowerCase().trim())
                );
                if (exactMatch) {
                  clienteSugerido = exactMatch;
                }
              }
            }

            // B) Búsqueda por palabras distintivas excluyendo palabras genéricas del rubro
            if (!clienteSugerido) {
              const STOP_WORDS = new Set([
                "DE", "DEL", "LA", "LAS", "EL", "LOS", "Y", "SUR", "NORTE", "ESTE", "OESTE",
                "CENTRO", "C.A.", "S.A.", "C.A", "S.A", "SRL", "LTDA", "COMERCIALIZADORA",
                "INVERSIONES", "DISTRIBUIDORA", "GRUPO", "REPUESTOS", "AUTO", "AUTOPARTES",
                "SERVICIOS", "TODO", "FRENOS", "LUBRICANTES", "IMPORT", "EXPORT", "VENTAS",
                "SUMINISTROS", "SOLUCIONES", "TALLER", "MULTISERVICIOS"
              ]);

              const palabras = cleanName
                .toUpperCase()
                .split(/[\s,.-]+/)
                .filter((p) => p.length >= 4 && !STOP_WORDS.has(p));

              // Exigir al menos 1 palabra distintiva y que coincidan con AND
              if (palabras.length >= 1) {
                const condiciones = palabras.map((p) =>
                  or(ilike(clientes.nombre, `%${p}%`), ilike(clientes.empresa, `%${p}%`))
                );
                const clientRows = await db.select().from(clientes).where(and(...condiciones));
                if (clientRows.length === 1) {
                  clienteSugerido = clientRows[0];
                }
              }
            }
          }
        }

        // B) Cruzar productos con catálogo por SKU
        const skus = Array.from(new Set(facturaExtraida.items.map((it) => it.codigoSku).filter(Boolean)));
        let dbProductosMap = new Map<string, any>();

        if (skus.length > 0) {
          const prodRows = await db
            .select()
            .from(productos)
            .where(inArray(productos.codigoSku, skus));

          prodRows.forEach((p) => {
            dbProductosMap.set(p.codigoSku.toUpperCase(), p);
          });
        }

        for (const it of facturaExtraida.items) {
          const prodDb = dbProductosMap.get(it.codigoSku.toUpperCase());
          if (prodDb) {
            itemsEnriquecidos.push({
              ...it,
              enCatalogo: true,
              productoId: prodDb.id,
              productoNombreDb: prodDb.nombre,
              stockActual: prodDb.stockActual,
              precioDb: Number(prodDb.precio),
            });
          } else {
            itemsEnriquecidos.push({
              ...it,
              enCatalogo: false,
            });
          }
        }
      } catch (dbErr) {
        console.error("Error consultando DB para enriquecer factura:", dbErr);
      }
    }

    // Si no hubo DB o falló, rellenar items sin enriquecer
    if (itemsEnriquecidos.length === 0) {
      facturaExtraida.items.forEach((it) => {
        itemsEnriquecidos.push({
          ...it,
          enCatalogo: false,
        });
      });
    }

    const itemsEncontrados = itemsEnriquecidos.filter((it) => it.enCatalogo).length;
    const itemsFaltantes = itemsEnriquecidos.length - itemsEncontrados;

    return NextResponse.json({
      success: true,
      motor: motorUsado,
      warning: warningMensaje,
      archivo: {
        nombre: file.name,
        tamano: file.size,
      },
      factura: {
        ...facturaExtraida,
        items: itemsEnriquecidos,
      },
      clienteSugerido: clienteSugerido
        ? {
            id: clienteSugerido.id,
            nombre: clienteSugerido.nombre,
            rif: clienteSugerido.rif,
            empresa: clienteSugerido.empresa,
            email: clienteSugerido.email,
            limiteCredito: clienteSugerido.limiteCredito,
          }
        : null,
      resumenValidacion: {
        totalFactura: facturaExtraida.total,
        totalItemsCalculado: Number(
          itemsEnriquecidos.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0).toFixed(2)
        ),
        totalItems: itemsEnriquecidos.length,
        itemsEncontradosEnCatalogo: itemsEncontrados,
        itemsFaltantesEnCatalogo: itemsFaltantes,
      },
    });
  } catch (error: any) {
    console.error("Error en POST /api/compras/importar-pdf:", error);
    return NextResponse.json(
      { error: error.message || "Error procesando el documento PDF de la factura" },
      { status: 500 }
    );
  }
}

/**
 * Extracción de contingencia cuando no hay conexión a modelos LLM
 */
function extraerFacturaHeuristica(rawText: string, fileName: string): FacturaExtraida {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // 1. Número de Factura
  let numeroFactura = `FAC-${Date.now().toString().slice(-6)}`;
  const matchFactura = rawText.match(/(?:factura|nota\s*de\s*entrega|control|comprobante)\s*(?:n[°ºrro.]*|#)?\s*([0-9A-Z-]{4,20})/i);
  if (matchFactura && matchFactura[1]) {
    numeroFactura = matchFactura[1].trim();
  }

  // 2. Fecha
  let fechaCompra = new Date().toISOString().split("T")[0];
  const matchFecha = rawText.match(/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b/);
  if (matchFecha) {
    const d = matchFecha[1].padStart(2, "0");
    const m = matchFecha[2].padStart(2, "0");
    let y = matchFecha[3];
    if (y.length === 2) y = "20" + y;
    fechaCompra = `${y}-${m}-${d}`;
  }

  // 3. Cliente y RIF del Comprador (evitando el membrete del emisor)
  let nombreCliente = "Cliente Detectado";
  let rif: string | undefined;

  const matchCliente = rawText.match(
    /(?:cliente|raz[oó]n\s*social|se[ñn]or(?:es)?|facturado\s*a|comprador)[\s:]*([^\n\r]+)/i
  );

  if (matchCliente && matchCliente[1]) {
    const rawNombre = matchCliente[1].trim();
    const rifEnLinea = rawNombre.match(/\b([JjVvGgEe]-?\d{7,9}-?\d?)\b/);
    if (rifEnLinea) {
      rif = rifEnLinea[1].toUpperCase();
      nombreCliente = rawNombre.replace(/\b([JjVvGgEe]-?\d{7,9}-?\d?)\b/gi, "").replace(/(?:rif|c\.?i\.?|c[eé]dula)[:\s]*/i, "").trim();
    } else {
      nombreCliente = rawNombre.replace(/(?:rif|c\.?i\.?|c[eé]dula)[:\s].*/i, "").trim();
    }
  }

  // Si no se encontró RIF en la línea del cliente, buscar el RIF en el bloque de datos del cliente
  if (!rif) {
    const matchRifCliente = rawText.match(/(?:cliente|comprador|se[ñn]or)[\s\S]{1,150}?\b([JjVvGgEe]-?\d{7,9}-?\d?)\b/i);
    if (matchRifCliente) {
      rif = matchRifCliente[1].toUpperCase();
    } else {
      // Si hay varios RIFs en todo el documento, el segundo suele ser el del cliente (el primero es el emisor en el membrete)
      const allRifs = Array.from(rawText.matchAll(/\b([JjVvGgEe]-?\d{7,9}-?\d?)\b/g)).map((m) => m[1].toUpperCase());
      if (allRifs.length > 1) {
        rif = allRifs[1];
      }
    }
  }

  if (!nombreCliente || nombreCliente.length < 3) {
    nombreCliente = rif ? `Cliente ${rif}` : "Cliente No Identificado";
  }

  // 5. Método de Pago y Condiciones
  let metodoPago = "transferencia";
  let condicionPago: string | undefined;
  if (/cr[eé]dito/i.test(rawText)) {
    metodoPago = "credito";
    const matchDias = rawText.match(/cr[eé]dito\s*(?:a\s*)?(\d{1,3})\s*d[ií]as/i);
    condicionPago = matchDias ? `CRÉDITO ${matchDias[1]} DÍAS` : "CRÉDITO COMERCIAL";
  } else if (/efectivo/i.test(rawText)) {
    metodoPago = "efectivo";
  } else if (/tarjeta/i.test(rawText)) {
    metodoPago = "tarjeta";
  }

  // 6. Ítems por patrón SKU (ej: ENFB-0016 o 4-5 letras seguido de guión o números)
  const items: ItemFacturaExtraido[] = [];
  const skuRegex = /\b([A-Z0-9]{3,6}-[0-9]{3,5})\b/i;
  const numRegex = /([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/g;

  for (const line of lines) {
    const skuMatch = line.match(skuRegex);
    if (skuMatch) {
      const sku = skuMatch[1].toUpperCase();
      // buscar números en la línea
      const numbers = Array.from(line.matchAll(numRegex)).map((m) => {
        const val = m[1].replace(/\./g, "").replace(",", ".");
        return parseFloat(val);
      });

      // buscar cantidad entera
      const cantMatch = line.match(/\b([1-9][0-9]?)\b/);
      const cantidad = cantMatch ? parseInt(cantMatch[1], 10) : 1;

      let precioUnitario = 10.0;
      let subtotal = cantidad * precioUnitario;

      if (numbers.length >= 2) {
        precioUnitario = numbers[0];
        subtotal = numbers[1];
      } else if (numbers.length === 1) {
        precioUnitario = numbers[0];
        subtotal = cantidad * precioUnitario;
      }

      // Nombre de producto sacado de la línea
      const descLimpia = line
        .replace(sku, "")
        .replace(/[0-9.,$]+/g, "")
        .replace(/\s+/g, " ")
        .trim();

      items.push({
        codigoSku: sku,
        nombre: descLimpia.length > 3 ? descLimpia : `Producto ${sku}`,
        cantidad,
        precioUnitario: Number(precioUnitario.toFixed(2)),
        subtotal: Number(subtotal.toFixed(2)),
      });
    }
  }

  // 7. Total
  let total = items.reduce((acc, it) => acc + it.subtotal, 0);
  const matchTotal = rawText.match(/total(?:\s*(?:general|factura|a\s*pagar))?\s*[:$]?\s*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})/i);
  if (matchTotal && matchTotal[1]) {
    const parsedTotal = parseFloat(matchTotal[1].replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsedTotal) && parsedTotal > 0) {
      total = parsedTotal;
    }
  }

  return {
    numeroFactura,
    tipoDocumento: /nota\s*de\s*entrega/i.test(rawText) ? "nota_entrega" : "factura",
    fechaCompra,
    clienteDetectado: {
      nombre: nombreCliente,
      rif,
    },
    metodoPago,
    condicionPago,
    notas: `Extraído automáticamente desde archivo ${fileName}.`,
    total: Number(total.toFixed(2)),
    items,
  };
}
