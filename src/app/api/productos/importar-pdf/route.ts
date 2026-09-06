import { NextResponse } from "next/server";
// @ts-ignore
import { PDFParse } from "pdf-parse";

export const dynamic = "force-dynamic";

export interface ProductoExtraido {
  idTemp: string;
  codigoSku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: string;
  stockActual: number;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo PDF" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Extraer texto del PDF con PDFParse
    let rawText = "";
    let numPages = 1;
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      rawText = typeof textResult === "string" ? textResult : (textResult?.text || "");
      if (textResult?.total) numPages = textResult.total;
    } finally {
      await parser.destroy();
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "No se pudo extraer texto legible del PDF. Es posible que sea un documento escaneado solo como imagen." },
        { status: 400 }
      );
    }

    // 2. Extraer productos del texto del catálogo
    const productosExtraidos: ProductoExtraido[] = [];
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    // Palabras reservadas que no son productos (cabeceras, pies de página, totales)
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
      { clave: "teclado", cat: "Periféricos" },
      { clave: "mouse", cat: "Periféricos" },
      { clave: "auricular", cat: "Audio" },
      { clave: "cable", cat: "Accesorios" },
      { clave: "switch", cat: "Redes" },
      { clave: "router", cat: "Redes" },
      { clave: "software", cat: "Software" },
      { clave: "licencia", cat: "Software" },
    ];

    let contadorSku = 1;

    for (const line of lines) {
      const lower = line.toLowerCase();
      // Descartar cabeceras comunes
      if (ignorar.some((w) => lower.startsWith(w) || lower === w)) {
        continue;
      }

      // Buscar si la línea tiene un precio (ej: $120.00, 150,00, 1,250.00, etc.)
      const priceRegex = /(?:\$|usd|bs\.?)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2})?)\s*(?:\$|usd|bs\.?)?/gi;
      const matches = Array.from(line.matchAll(priceRegex));

      if (matches.length > 0) {
        // Tomar el último match como precio probable (las columnas de precio suelen estar al final)
        const lastMatch = matches[matches.length - 1];
        const rawPrice = lastMatch[1];
        
        // Normalizar precio a decimal (remplazar comas decimales o puntos de miles)
        let normalizedPrice = rawPrice.replace(/\./g, "").replace(",", ".");
        if (rawPrice.includes(".") && rawPrice.includes(",")) {
          // formato 1.250,50
          normalizedPrice = rawPrice.replace(/\./g, "").replace(",", ".");
        } else if (rawPrice.includes(",") && !rawPrice.includes(".")) {
          normalizedPrice = rawPrice.replace(",", ".");
        }

        const precioNum = parseFloat(normalizedPrice);
        if (isNaN(precioNum) || precioNum <= 0) continue;

        // Extraer texto previo al precio
        let nameAndSku = line.substring(0, lastMatch.index).trim();
        if (!nameAndSku || nameAndSku.length < 3) continue;

        // Detectar SKU al inicio (ej: PROD-01, #1234, SKU123, o palabra en mayúsculas/números)
        const tokens = nameAndSku.split(/\s+/);
        let sku = "";
        let nombre = nameAndSku;

        if (tokens.length > 1) {
          const firstToken = tokens[0].replace(/^[#:\-\/]/, "");
          if (/^[A-Z0-9_\-]{3,15}$/i.test(firstToken)) {
            sku = firstToken.toUpperCase();
            nombre = tokens.slice(1).join(" ");
          }
        }

        if (!sku) {
          sku = `SKU-PDF-${String(contadorSku).padStart(3, "0")}`;
          contadorSku++;
        }

        // Inferir categoría
        let categoria = "General";
        for (const c of categoriasComunes) {
          if (nombre.toLowerCase().includes(c.clave)) {
            categoria = c.cat;
            break;
          }
        }

        // Detectar si hay un número pequeño que represente stock
        let stock = 10; // default
        const stockMatch = line.match(/\b([1-9][0-9]?)\s*(?:unid|uds|piezas|pcs)?\b/i);
        if (stockMatch && stockMatch[1] && stockMatch.index !== lastMatch.index) {
          const s = parseInt(stockMatch[1], 10);
          if (s > 0 && s < 1000) stock = s;
        }

        productosExtraidos.push({
          idTemp: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          codigoSku: sku,
          nombre: nombre.replace(/[|;,\-]$/, "").trim(),
          descripcion: `Importado automáticamente desde ${file.name}`,
          categoria,
          precio: precioNum.toFixed(2),
          stockActual: stock,
        });
      }
    }

    return NextResponse.json({
      success: true,
      archivo: file.name,
      paginas: numPages,
      totalDetectados: productosExtraidos.length,
      productos: productosExtraidos,
      resumenTexto: rawText.substring(0, 500) + (rawText.length > 500 ? "..." : ""),
    });
  } catch (error: any) {
    console.error("Error al procesar PDF:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar el archivo PDF" },
      { status: 500 }
    );
  }
}
