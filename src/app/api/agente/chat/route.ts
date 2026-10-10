import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export interface MensajeChat {
  role: "user" | "model" | "assistant";
  content: string;
}

export interface AdjuntoChat {
  nombre: string;
  tipo: string; // mime type
  base64: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mensaje,
      historial = [],
      indicacionesPersonalizadas = "",
      adjunto, // opcional: { nombre, tipo, base64 }
      apiKey: apiKeyCustom,
    } = body;

    if ((!mensaje || typeof mensaje !== "string") && !adjunto) {
      return NextResponse.json(
        { error: "Se requiere un mensaje de texto o un archivo adjunto válido." },
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

      const metricasMensuales = await DataService.getClientesMetricasMensuales();
      const resumenMetricasMensuales = metricasMensuales
        .map((m, idx) => {
          const mesesDetalle = Object.entries(m.historialPorMes)
            .map(([per, val]) => `${per}: $${val.total.toLocaleString()} (${val.ordenes} ord)`)
            .join(", ");
          return `${idx + 1}. ${m.nombre} (${m.empresa || "Particular"} | RIF: ${m.rif || "N/A"}):
   - Promedio Mensual: $${m.promedioMensual.toLocaleString()} / mes (Periodo: ${m.primerMes} a ${m.ultimoMes}, ${m.mesesPeriodoTotal} meses totales)
   - Promedio por Mes con Compra: $${m.promedioPorMesActivo.toLocaleString()} / mes (${m.mesesConCompra} meses activos)
   - Frecuencia: ${m.ordenesPorMes} órdenes/mes | Ticket Promedio: $${m.ticketPromedio.toLocaleString()}
   - Último Mes Facturado (${m.ultimoMes}): $${m.ultimoMesFacturado.toLocaleString()} (Tendencia: ${m.tendenciaUltimoMesPct > 0 ? "+" : ""}${m.tendenciaUltimoMesPct}% vs promedio)
   - Historial mensual: [${mesesDetalle}]`;
        })
        .join("\n\n");

      contextoDb = `
DATOS ACTUALES DEL SISTEMA (Neon PostgreSQL):
- Total Ventas Facturadas: $${stats.kpis.totalVentas.toLocaleString()}
- Ticket Promedio: $${stats.kpis.ticketPromedio}
- Total Clientes Registrados: ${stats.kpis.totalClientes}
- Total Productos en Portafolio: ${stats.kpis.totalProductos}
- Total Órdenes de Compra: ${stats.kpis.totalCompras}

COMPORTAMIENTO Y PROMEDIOS MENSUALES DE CLIENTES:
${resumenMetricasMensuales || "Sin historial suficiente de compras"}

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
- Si el usuario te da indicaciones personalizadas adicionales durante la conversación, adáptate de inmediato a sus preferencias de análisis y estilo.

INSTRUCCIONES PARA ANÁLISIS DE CLIENTES POR PROMEDIOS MENSUALES:
- Cuando el usuario te consulte o solicite analizar clientes según promedios mensuales o comportamiento temporal:
  1. Utiliza las métricas detalladas del bloque 'COMPORTAMIENTO Y PROMEDIOS MENSUALES DE CLIENTES'.
  2. Diferencia entre el 'Promedio Mensual Global' (distribuido a lo largo de todo el periodo desde su primera compra) y el 'Promedio por Mes Activo' (solo meses donde compró efectivamente).
  3. Analiza la tendencia y regularidad: revisa el historial mes a mes e identifica meses pico (máximos de compra) y meses valle o caídas.
  4. Alerta sobre caídas de consumo recientes: resalta si en los últimos meses facturó significativamente por debajo de su promedio histórico.
  5. Segmenta la cartera según su potencial de consumo mensual y propone estrategias comerciales proactivas de seguimiento y reactivación.`;

    // 3. Invocar al Agente Gemini con el modelo gemini-3.8-flash
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

    // Preparar el mensaje actual del usuario (texto + archivo adjunto si existe)
    const userParts: any[] = [];

    if (adjunto && adjunto.base64) {
      // Limpiar prefijo data:mime;base64, si viene incluido
      let pureBase64 = adjunto.base64;
      if (pureBase64.includes(",")) {
        pureBase64 = pureBase64.split(",")[1];
      }

      userParts.push({
        inlineData: {
          data: pureBase64,
          mimeType: adjunto.tipo || "application/pdf",
        },
      });

      userParts.push({
        text: `[Archivo adjuntado por el usuario: "${adjunto.nombre}"]\n${mensaje || "Por favor analiza este documento o imagen y responde a mis requerimientos."}`,
      });
    } else {
      userParts.push({ text: mensaje });
    }

    contents.push({
      role: "user",
      parts: userParts,
    });

    // 3. Invocar al Agente Gemini priorizando gemini-3.5-flash-lite (500 RPD en Free Tier)
    const modeloSolicitado = (body.modelo as string) || "gemini-3.5-flash-lite";
    const candidatos = [
      modeloSolicitado,
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
    ];
    const modelosIntentar = Array.from(new Set(candidatos));

    let response;
    let modeloExitoso = "";
    let ultimoError: any = null;

    for (const model of modelosIntentar) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
          },
        });
        if (response) {
          modeloExitoso = model;
          break;
        }
      } catch (err: any) {
        ultimoError = err;
        console.warn(`[Agente Chat] Error o alta demanda con ${model}:`, err?.message || err);
        // Pausa preventiva de 800ms antes del fallback para que el gateway de Google no descarte la solicitud sucesiva
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    if (!response) {
      const errMsg = ultimoError?.message || "";
      if (ultimoError?.status === 429 || errMsg.includes("Quota exceeded") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        throw new Error(
          "Se ha agotado la cuota diaria gratuita para este modelo en Google AI Studio (límite de 20 peticiones por día en el tier gratuito). Por favor selecciona otro modelo en las indicaciones (como Gemini 3.5 Flash Lite) o utiliza una clave de API con cuota disponible."
        );
      }
      throw new Error(
        ultimoError?.message || "Los modelos de Gemini están experimentando alta demanda momentánea en los servidores de Google. Por favor intenta nuevamente en unos instantes."
      );
    }

    const respuestaTexto = response.text || "No se obtuvo respuesta del agente.";

    return NextResponse.json({
      success: true,
      respuesta: respuestaTexto,
      modeloUsado: modeloExitoso,
    });
  } catch (error: any) {
    console.error("Error en API Agente Chat:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar consulta con el Agente Gemini" },
      { status: 500 }
    );
  }
}