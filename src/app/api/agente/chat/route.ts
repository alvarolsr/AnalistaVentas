import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export interface MensajeChat {
  role: "user" | "model" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mensaje,
      historial = [],
      indicacionesPersonalizadas = "",
      apiKey: apiKeyCustom,
    } = body;

    if (!mensaje || typeof mensaje !== "string") {
      return NextResponse.json(
        { error: "Se requiere un mensaje válido" },
        { status: 400 }
      );
    }

    const apiKey =
      apiKeyCustom ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No se ha configurado la clave de Gemini. Por favor proporciona una API Key o define GEMINI_API_KEY en las variables de entorno.",
        },
        { status: 401 }
      );
    }

    // 1. Obtener contexto en tiempo real de Neon PostgreSQL
    let contextoDb = "";
    try {
      const stats = await DataService.getDashboardStats();
      const clientes = await DataService.getClientes();
      const productos = await DataService.getProductos();

      const resumenClientes = clientes
        .slice(0, 15)
        .map(
          (c) =>
            `- ${c.nombre} (${c.empresa || "Particular"}), RIF: ${c.rif || "No registrado"}, Email: ${c.email || "N/A"}`
        )
        .join("\n");

      const resumenProductos = productos
        .slice(0, 25)
        .map(
          (p) =>
            `- [${p.codigoSku}] ${p.nombre} | Marca: ${p.marca || "Genérica"} | Cat: ${p.categoria} | Precio: $${p.precio} | Stock: ${p.stockActual}`
        )
        .join("\n");

      const resumenTopClientes = stats.topClientes
        .map(
          (tc, idx) =>
            `${idx + 1}. ${tc.nombre} (${tc.empresa}): Total $${tc.total.toLocaleString()} en ${tc.ordenes} órdenes`
        )
        .join("\n");

      const resumenTopProductos = stats.topProductos
        .map(
          (tp, idx) =>
            `${idx + 1}. [${tp.sku}] ${tp.nombre}: ${tp.cantidad} unidades vendidas ($${tp.totalRecaudado.toLocaleString()})`
        )
        .join("\n");

      const resumenStockBajo = stats.stockBajo
        .map((sb) => `- [${sb.codigoSku}] ${sb.nombre}: Stock actual ${sb.stockActual}`)
        .join("\n");

      contextoDb = `
DATOS ACTUALES DEL SISTEMA (Neon PostgreSQL):
- Total Ventas Facturadas: $${stats.kpis.totalVentas.toLocaleString()}
- Ticket Promedio: $${stats.kpis.ticketPromedio}
- Total Clientes Registrados: ${stats.kpis.totalClientes}
- Total Productos en Portafolio: ${stats.kpis.totalProductos}
- Total Órdenes de Compra: ${stats.kpis.totalCompras}

TOP CLIENTES POR FACTURACIÓN:
${resumenTopClientes || "Sin ventas aún"}

TOP PRODUCTOS MÁS VENDIDOS:
${resumenTopProductos || "Sin ventas aún"}

ALERTAS DE INVENTARIO (Stock bajo <= 10 unidades):
${resumenStockBajo || "Inventario en niveles estables"}

MUESTRA DE CLIENTES ACTIVOS:
${resumenClientes || "Sin clientes"}

MUESTRA DE PRODUCTOS EN CATÁLOGO:
${resumenProductos || "Sin productos"}
`;
    } catch (errDb) {
      console.warn("No se pudo obtener el contexto de Neon para el agente:", errDb);
      contextoDb = "Nota: No se pudo sincronizar el estado actual de la base de datos en este instante.";
    }

    // 2. Definición del System Prompt con instrucciones personalizadas
    const directricesUsuario = indicacionesPersonalizadas?.trim()
      ? `\nDIRECTRICES E INDICACIONES PERSONALIZADAS DEL USUARIO:\n${indicacionesPersonalizadas.trim()}\n`
      : "";

    const systemInstruction = `Eres el Agente Analista de Ventas y Estrategia Comercial de la plataforma.
Tu propósito es ayudar al usuario a analizar métricas comerciales, evaluar la cartera de clientes, recomendar acciones sobre el catálogo de productos y optimizar las ventas basándote en datos reales.

${directricesUsuario}

${contextoDb}

REGLAS DE RESPUESTA:
- Responde siempre en español, con un tono profesional, analítico, claro y orientado a la acción de negocios.
- Apóyate en los datos reales suministrados arriba (clientes con sus RIFs, SKUs, marcas, existencias, precios y métricas de venta).
- Si el usuario te pide un cálculo o comparativa, sé preciso y explica el razonamiento.
- Emplea formato Markdown con negritas, listas o tablas cuando ayude a estructurar mejor la información.
- Si el usuario te da indicaciones personalizadas adicionales durante la conversación, adáptate de inmediato a sus preferencias de análisis y estilo.`;

    // 3. Invocar al Agente Gemini con el modelo gemini-3.6-flash
    const ai = new GoogleGenAI({ apiKey });

    // Preparar el historial de chat compatible
    const contents: any[] = [];

    // Agregar mensajes previos del historial si existen
    if (Array.isArray(historial) && historial.length > 0) {
      for (const msg of historial.slice(-10)) {
        if (!msg.content) continue;
        const role = msg.role === "user" ? "user" : "model";
        contents.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    // Agregar el mensaje actual del usuario
    contents.push({
      role: "user",
      parts: [{ text: mensaje }],
    });

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents,
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
        },
      });
    } catch (err36: any) {
      console.warn("Fallo con gemini-3.6-flash en chat, reintentando con gemini-2.5-flash:", err36?.message);
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          temperature: 0.3,
        },
      });
    }

    const respuestaTexto = response.text || "No se obtuvo respuesta del agente.";

    return NextResponse.json({
      success: true,
      respuesta: respuestaTexto,
    });
  } catch (error: any) {
    console.error("Error en API Agente Chat:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar consulta con el Agente Gemini" },
      { status: 500 }
    );
  }
}