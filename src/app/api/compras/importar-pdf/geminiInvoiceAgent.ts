import { GoogleGenAI, Type } from "@google/genai";

export interface ItemFacturaExtraido {
  codigoSku: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface FacturaExtraida {
  numeroFactura: string;
  tipoDocumento: "factura" | "nota_entrega" | "orden_compra" | "comprobante";
  fechaCompra: string; // YYYY-MM-DD
  clienteDetectado: {
    nombre: string;
    rif?: string;
    empresa?: string;
    direccion?: string;
    telefono?: string;
  };
  metodoPago: string; // "credito" | "transferencia" | "efectivo" | "tarjeta"
  condicionPago?: string; // ej: "Crédito 30 días"
  vendedor?: string;
  notas: string;
  total: number;
  items: ItemFacturaExtraido[];
}

export interface OpcionesExtraccionFactura {
  pdfBuffer: Uint8Array;
  fileName: string;
  apiKey?: string;
}

export async function extraerFacturaConGemini(
  opciones: OpcionesExtraccionFactura
): Promise<FacturaExtraida> {
  const apiKey =
    opciones.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("No se ha configurado ninguna API Key de Gemini (GEMINI_API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64Pdf = Buffer.from(opciones.pdfBuffer).toString("base64");

  const prompt = `Eres un auditor contable y analista comercial experto en procesamiento inteligente de documentos mercantiles (Facturas Comerciales, Notas de Entrega, Notas de Despacho, Comprobantes de Venta y Órdenes de Pedido).

Analiza exhaustivamente este documento PDF y extrae con máxima fidelidad y precisión todos los datos de la factura o nota de entrega:

1. **NÚMERO DE COMPROBANTE / FACTURA**:
   - Extrae el número de Factura, Nota de Entrega, Número de Control o Comprobante (ej: "2000020328", "FAC-0084", "NE-10293").
   - Si no está explícito, usa el número de pedido o genera un identificador representativo. NUNCA lo dejes vacío.

2. **TIPO DE DOCUMENTO**:
   - Determina si es "factura", "nota_entrega", "orden_compra" o "comprobante".

3. **FECHA**:
   - Extrae la fecha de emisión del documento en formato YYYY-MM-DD (ej: "2026-07-08"). Si no tiene año o está en formato DD/MM/YYYY, conviértelo correctamente a YYYY-MM-DD.

4. **CLIENTE / COMPRADOR (RECEPTOR DEL COMPROBANTE)**:
   - **ATENCIÓN CRÍTICA - NO CONFUNDIR CON EL EMISOR**:
     En el encabezado o membrete superior suele figurar la empresa emisora que factura (por ejemplo: proveedores, distribuidoras o empresas como 'TODO FRENOS DEL SUR, C.A.'). NUNCA extraigas a la empresa emisora como cliente.
     El CLIENTE es la persona, taller, tienda o empresa que COMPRA y RECIBE la mercancía, identificado bajo secciones como "Cliente:", "Facturado a:", "Señor(es):", "Razón Social:", "Comprador:", "Entregar a:".
   - **nombre**: Nombre o razón social del CLIENTE COMPRADOR.
   - **rif**: RIF o identificación fiscal del CLIENTE COMPRADOR (NUNCA el RIF del emisor).
   - Extrae dirección de entrega/despacho, teléfono o contacto si están visibles.

5. **MÉTODO DE PAGO Y CONDICIONES**:
   - Identifica si la venta es a "credito" (ej: crédito a 15, 30, 45 o 60 días), "transferencia", "efectivo", o "tarjeta".
   - Extrae la condición comercial textual si existe (ej: "CREDITO 30 DIAS", "Vencimiento: 07/08/2026").

6. **OBSERVACIONES / NOTAS**:
   - Extrae información complementaria relevante: número de pedido de cliente (PCLI #), vendedor asignado, condiciones de despacho, dirección de entrega, usuario emisor.

7. **DESGLOSE DE ÍTEMS / RENGLONES**:
   - Extrae CADA UNO de los productos o ítems detallados en la tabla del documento.
   - **codigoSku**: Código SKU, Part Number, Código de catálogo o Código de parte (ej: "ENFB-0016", "BKBP-0007", "DTCU-0002").
   - **nombre**: Descripción o nombre comercial del producto (limpio de encabezados).
   - **cantidad**: Número entero de unidades compradas/entregadas (>= 1).
   - **precioUnitario**: Precio unitario numérico en dólares USD o moneda del documento (número flotante positivo con 2 decimales).
   - **subtotal**: Monto subtotal del ítem (cantidad × precio unitario).

8. **TOTAL**:
   - Monto total final a pagar o facturado de la transacción (número flotante positivo).

Asegúrate de que la suma de subtotales coincida o aproxime al Total de la factura.`;

  const contents = [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            data: base64Pdf,
            mimeType: "application/pdf",
          },
        },
        {
          text: prompt,
        },
      ],
    },
  ];

  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        numeroFactura: {
          type: Type.STRING,
          description: "Número de factura, nota de entrega o comprobante.",
        },
        tipoDocumento: {
          type: Type.STRING,
          enum: ["factura", "nota_entrega", "orden_compra", "comprobante"],
          description: "Tipo de comprobante analizado.",
        },
        fechaCompra: {
          type: Type.STRING,
          description: "Fecha en formato YYYY-MM-DD.",
        },
        clienteDetectado: {
          type: Type.OBJECT,
          properties: {
            nombre: { type: Type.STRING, description: "Nombre o razón social del cliente." },
            rif: { type: Type.STRING, description: "RIF o número de identificación fiscal." },
            empresa: { type: Type.STRING, description: "Nombre de empresa o compañía." },
            direccion: { type: Type.STRING, description: "Dirección fiscal o de entrega." },
            telefono: { type: Type.STRING, description: "Número telefónico." },
          },
          required: ["nombre"],
        },
        metodoPago: {
          type: Type.STRING,
          enum: ["credito", "transferencia", "efectivo", "tarjeta"],
          description: "Método de pago identificado.",
        },
        condicionPago: {
          type: Type.STRING,
          description: "Condición o plazo comercial, ej: 'CREDITO 30 DIAS'.",
        },
        vendedor: {
          type: Type.STRING,
          description: "Vendedor o asesor comercial que atendió.",
        },
        notas: {
          type: Type.STRING,
          description: "Notas, observaciones, número de pedido o datos de entrega.",
        },
        total: {
          type: Type.NUMBER,
          description: "Monto total facturado.",
        },
        items: {
          type: Type.ARRAY,
          description: "Lista de todos los ítems o productos facturados.",
          items: {
            type: Type.OBJECT,
            properties: {
              codigoSku: { type: Type.STRING, description: "Código SKU o número de parte." },
              nombre: { type: Type.STRING, description: "Nombre o descripción del producto." },
              cantidad: { type: Type.INTEGER, description: "Cantidad de unidades." },
              precioUnitario: { type: Type.NUMBER, description: "Precio unitario." },
              subtotal: { type: Type.NUMBER, description: "Subtotal calculado o listado." },
            },
            required: ["codigoSku", "nombre", "cantidad", "precioUnitario"],
          },
        },
      },
      required: ["numeroFactura", "fechaCompra", "clienteDetectado", "total", "items"],
    },
  };

  const modelosIntentar = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
  let response: any = null;
  let ultimoError: any = null;

  for (const model of modelosIntentar) {
    try {
      response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      if (response && response.text) {
        break;
      }
    } catch (err: any) {
      ultimoError = err;
      console.warn(`[Gemini Invoice Agent] Falló modelo ${model}:`, err?.message || err);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }

  if (!response || !response.text) {
    throw new Error(
      ultimoError?.message || "No se pudo extraer la factura con los modelos de Gemini disponibles."
    );
  }

  const rawJson = response.text.trim();
  const data = JSON.parse(rawJson);

  // Normalizar items
  const itemsNormalizados: ItemFacturaExtraido[] = (data.items || []).map((it: any) => {
    const cant = Math.max(1, parseInt(it.cantidad, 10) || 1);
    const precio = Math.max(0, parseFloat(it.precioUnitario) || 0);
    const subtotal = it.subtotal ? parseFloat(it.subtotal) : Number((cant * precio).toFixed(2));
    return {
      codigoSku: (it.codigoSku || "SKU-S/C").trim().toUpperCase(),
      nombre: (it.nombre || "Producto sin nombre").trim(),
      cantidad: cant,
      precioUnitario: Number(precio.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
    };
  });

  const totalCalculado = itemsNormalizados.reduce((acc, it) => acc + it.subtotal, 0);
  const totalFinal = data.total && !isNaN(Number(data.total)) ? Number(data.total) : Number(totalCalculado.toFixed(2));

  return {
    numeroFactura: String(data.numeroFactura || `FAC-${Date.now().toString().slice(-6)}`).trim(),
    tipoDocumento: data.tipoDocumento || "factura",
    fechaCompra: data.fechaCompra || new Date().toISOString().split("T")[0],
    clienteDetectado: {
      nombre: data.clienteDetectado?.nombre || "Cliente no identificado",
      rif: data.clienteDetectado?.rif || undefined,
      empresa: data.clienteDetectado?.empresa || undefined,
      direccion: data.clienteDetectado?.direccion || undefined,
      telefono: data.clienteDetectado?.telefono || undefined,
    },
    metodoPago: data.metodoPago || "transferencia",
    condicionPago: data.condicionPago || undefined,
    vendedor: data.vendedor || undefined,
    notas: data.notas || "",
    total: Number(totalFinal.toFixed(2)),
    items: itemsNormalizados,
  };
}
