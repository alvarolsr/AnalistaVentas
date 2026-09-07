import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { extraerProductosConGemini } from "./geminiAgent";

export const dynamic = "force-dynamic";

export interface ProductoExtraido {
  idTemp: string;
  codigoSku: string;
  nombre: string;
  marca?: string;
  descripcion: string;
  categoria: string;
  precio: string;
  stockActual: number;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    const apiKeyCustom = (formData.get("apiKey") as string | null) || undefined;
    const modoFuerza = (formData.get("modo") as string | null) || "auto"; // "gemini", "heuristico", "auto"

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo PDF" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Determinar si tenemos clave para Gemini
    const hasGeminiKey = Boolean(
      apiKeyCustom ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY
    );

    // Intentar procesamiento con Agente Gemini si está habilitado
    if (modoFuerza !== "heuristico" && hasGeminiKey) {
      try {
        console.log(`[Gemini Agent] Analizando ${file.name} con Gemini...`);
        const productosGemini = await extraerProductosConGemini({
          pdfBuffer: uint8Array,
          fileName: file.name,
          apiKey: apiKeyCustom,
        });

        if (productosGemini && productosGemini.length > 0) {
          return NextResponse.json({
            success: true,
            motor: "gemini",
            archivo: file.name,
            totalDetectados: productosGemini.length,
            productos: productosGemini,
            mensaje: `El Agente Gemini identificó ${productosGemini.length} productos y sus categorías exitosamente.`,
          });
        }
      } catch (geminiError: any) {
        console.warn("[Gemini Agent] Error o límite en Gemini, activando fallback heurístico:", geminiError.message);
        // Si el usuario forzó explícitamente modo "gemini", devolvemos el error directo
        if (modoFuerza === "gemini") {
          return NextResponse.json(
            { error: `Error en el Agente Gemini: ${geminiError.message || "No se pudo procesar con Gemini"}` },
            { status: 500 }
          );
        }
      }
    }

    // Fallback: Extracción Heurística con unpdf
    let rawText = "";
    let numPages = 1;

    try {
      const extracted = await extractText(uint8Array);
      numPages = extracted.totalPages || 1;
      rawText = Array.isArray(extracted.text) ? extracted.text.join("\n") : (extracted.text || "");
    } catch (pdfErr: any) {
      console.error("Error en extractText:", pdfErr);
      return NextResponse.json(
        { error: `No se pudo leer el archivo PDF: ${pdfErr.message || "Estructura no válida"}` },
        { status: 400 }
      );
    }

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { error: "No se encontró texto legible en el PDF. Si es un documento escaneado como imagen (foto), asegúrate de que contenga texto seleccionable." },
        { status: 400 }
      );
    }

    // 2. Extraer productos del texto del catálogo con heurísticas
    const productosExtraidos: ProductoExtraido[] = [];
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    // Palabras a ignorar (cabeceras, totales, pies de página)
    const ignorar = [
      "total", "subtotal", "iva", "página", "pagina", "page", "fecha", "cliente",
      "factura", "rif", "telefono", "dirección", "direccion", "condiciones",
      "cuenta bancaria", "banco", "precio", "descripción", "descripcion", "cantidad"
    ];

    const categoriasComunes = [
      { clave: "laptop", cat: "Computación" },
      { clave: "computador", cat: "Computación" },
      { clave: "pc", cat: "Computación" },
      { clave: "servidor", cat: "Infraestructura" },
      { clave: "rack", cat: "Infraestructura" },
      { clave: "monitor", cat: "Periféricos" },
      { clave: "pantalla", cat: "Periféricos" },
      { clave: "teclado", cat: "Periféricos" },
      { clave: "mouse", cat: "Periféricos" },
      { clave: "auricular", cat: "Audio" },
      { clave: "corneta", cat: "Audio" },
      { clave: "cable", cat: "Accesorios" },
      { clave: "switch", cat: "Redes" },
      { clave: "router", cat: "Redes" },
      { clave: "software", cat: "Software" },
      { clave: "licencia", cat: "Software" },
    ];

    let contadorSku = 1;

    for (let rawLine of lines) {
      const lower = rawLine.toLowerCase();
      // Descartar cabeceras comunes
      if (ignorar.some((w) => lower.startsWith(w) || lower === w)) {
        continue;
      }

      // 1. Extraer stock explícito (ej: "5 unid", "12 pcs", "stock: 20")
      let stock = 10;
      const stockExplicitMatch = rawLine.match(/\b([0-9]{1,4})\s*(?:unid|uds|piezas|pcs|unidades)\b/i);
      if (stockExplicitMatch && stockExplicitMatch[1]) {
        stock = parseInt(stockExplicitMatch[1], 10);
        rawLine = rawLine.replace(stockExplicitMatch[0], " ").trim();
      }

      // 2. Buscar patrón de precio (con decimales o símbolo de moneda)
      const priceRegexWithDecimals = /(?:\$|usd|bs\.?|€)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*[.,][0-9]{2})\s*(?:\$|usd|bs\.?|€)?/gi;
      let priceMatches = Array.from(rawLine.matchAll(priceRegexWithDecimals));

      if (priceMatches.length === 0) {
        const priceRegexWithCurrency = /(?:\$|usd|bs\.?|€)\s*([0-9]+(?:\.[0-9]{1,2})?)/gi;
        priceMatches = Array.from(rawLine.matchAll(priceRegexWithCurrency));
      }
      if (priceMatches.length === 0) {
        const priceRegexEndNumber = /\b([0-9]+(?:[.,][0-9]{2})?)\s*$/gi;
        priceMatches = Array.from(rawLine.matchAll(priceRegexEndNumber));
      }

      if (priceMatches.length > 0) {
        const lastMatch = priceMatches[priceMatches.length - 1];
        const rawPrice = lastMatch[1];

        // Normalizar precio a decimal estándar
        let normalizedPrice = rawPrice;
        if (rawPrice.includes(".") && rawPrice.includes(",")) {
          normalizedPrice = rawPrice.replace(/\./g, "").replace(",", ".");
        } else if (rawPrice.includes(",") && !rawPrice.includes(".")) {
          normalizedPrice = rawPrice.replace(",", ".");
        }

        const precioNum = parseFloat(normalizedPrice);
        if (isNaN(precioNum) || precioNum <= 0) continue;

        // Extraer texto previo o posterior al precio como nombre/sku
        let nameAndSku = rawLine.replace(lastMatch[0], " ").trim();
        if (!nameAndSku || nameAndSku.length < 2) continue;

        // Detectar SKU al inicio
        const tokens = nameAndSku.split(/\s+/);
        let sku = "";
        let nombre = nameAndSku;

        if (tokens.length > 1) {
          const firstToken = tokens[0].replace(/^[#:\-\/]/, "");
          if (/^[A-Z0-9_\-]{2,15}$/i.test(firstToken) && /[A-Z0-9]/i.test(firstToken)) {
            sku = firstToken.toUpperCase();
            nombre = tokens.slice(1).join(" ");
          }
        }

        if (!sku) {
          sku = `SKU-PDF-${String(contadorSku).padStart(3, "0")}`;
          contadorSku++;
        }

        // Categoría inferida
        let categoria = "General";
        for (const c of categoriasComunes) {
          if (nombre.toLowerCase().includes(c.clave)) {
            categoria = c.cat;
            break;
          }
        }

        // Marca inferida
        const marcasComunes = [
          "HP", "Lenovo", "Dell", "Asus", "Acer", "Apple", "Samsung", "LG",
          "Logitech", "TP-Link", "Cisco", "Kingston", "Corsair", "Epson",
          "Canon", "Sony", "Xiaomi", "Huawei", "Intel", "AMD", "NVIDIA", "Microsoft"
        ];
        let marca = "";
        for (const m of marcasComunes) {
          if (new RegExp(`\\b${m}\\b`, "i").test(nombre)) {
            marca = m;
            break;
          }
        }

        productosExtraidos.push({
          idTemp: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          codigoSku: sku,
          nombre: nombre.replace(/[|;,\-]$/, "").trim(),
          marca: marca || undefined,
          descripcion: `Importado de ${file.name}`,
          categoria,
          precio: precioNum.toFixed(2),
          stockActual: stock,
        });
      }
    }

    return NextResponse.json({
      success: true,
      motor: "heuristico",
      archivo: file.name,
      paginas: numPages,
      totalDetectados: productosExtraidos.length,
      productos: productosExtraidos,
      resumenTexto: rawText.substring(0, 300) + (rawText.length > 300 ? "..." : ""),
    });
  } catch (error: any) {
    console.error("Error al procesar PDF:", error);
    return NextResponse.json(
      { error: error.message || "Error inesperado al procesar el archivo PDF" },
      { status: 500 }
    );
  }
}
