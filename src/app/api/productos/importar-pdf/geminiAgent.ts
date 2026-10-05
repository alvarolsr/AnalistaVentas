import { GoogleGenAI, Type } from "@google/genai";
import { ProductoExtraido } from "./route";

export interface OpcionesExtraccionGemini {
  pdfBuffer: Uint8Array;
  fileName: string;
  apiKey?: string;
  rawTextFallback?: string;
}

/**
 * Agente Gemini para extracción e identificación inteligente de productos,
 * categorías jerárquicas, marcas, SKUs y precios desde archivos PDF.
 */
export async function extraerProductosConGemini(
  opciones: OpcionesExtraccionGemini
): Promise<ProductoExtraido[]> {
  const apiKey =
    opciones.apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("No se ha configurado ninguna API Key de Gemini (GEMINI_API_KEY).");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Convertir el buffer a base64 para envío inline
  const base64Pdf = Buffer.from(opciones.pdfBuffer).toString("base64");

  const prompt = `Eres un agente experto en análisis de catálogos comerciales, cotizaciones y listas de precios mayoristas de tecnología y productos comerciales.
Tu tarea es analizar exhaustivamente este documento PDF y extraer CADA UNO de los productos individuales listados en él.

INSTRUCCIONES CLAVE DE EXTRACCIÓN:
1. **CATEGORÍAS Y SUBLÍNEAS**: Identifica las secciones, títulos de grupos, líneas de producto o encabezados de categoría (ej: "Laptops / Portátiles", "Servidores", "Almacenamiento", "Monitores", "Redes / Routers", "Accesorios", "Impresión"). Asigna a cada producto la categoría o sublínea exacta a la que pertenece según la estructura del documento.
2. **CÓDIGO SKU**: Extrae el código de producto, modelo del fabricante (Part Number) o SKU visible en la tabla o ficha (ej: "20W0005VUS", "MGN63LA/A", "TL-SG108"). Si un producto no tiene SKU explícito en la tabla, genera uno descriptivo y consistente usando la marca y modelo (ej: "HP-ENVY-15", "DELL-LAT-3520"). NUNCA lo dejes vacío.
3. **MARCA**: La marca debe ser ESTRICTAMENTE una de estas dos opciones: "LYC" o "PAI". Si el catálogo o producto corresponde a LYC, asigna "LYC". Si corresponde a PAI, asigna "PAI". Si no se especifica explícitamente, deduce la más adecuada entre "LYC" y "PAI" (por defecto "LYC"). NUNCA asignes otra marca distinta a "LYC" o "PAI".
4. **NOMBRE**: Título limpio y representativo del producto sin incluir palabras de relleno de la tabla.
5. **PRECIO**: Extrae el precio unitario numérico (en dólares USD o moneda principal de la lista). Debe ser un número con hasta 2 decimales (ej: 450.50). Si hay múltiples precios (ej. mayorista vs detalle), usa el precio principal o unitario. Si no tiene precio explícito, asigna 0.
6. **STOCK**: Si el documento muestra unidades disponibles, cantidad o inventario, extrae el número entero. Si no se especifica stock, coloca 10 como valor por defecto.
7. **DESCRIPCIÓN**: Extrae un resumen conciso de las especificaciones técnicas o características del ítem (procesador, RAM, almacenamiento, puertos, color, etc.).

Ignora portadas decorativas, tablas de condiciones bancarias, términos y condiciones legales y pies de página que no sean productos reales.`;

  try {
    // Intentamos con gemini-3.8-flash (con fallback a gemini-3.8-pro)
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
          productos: {
            type: Type.ARRAY,
            description: "Lista de todos los productos individuales identificados en el catálogo.",
            items: {
              type: Type.OBJECT,
              properties: {
                codigoSku: {
                  type: Type.STRING,
                  description: "Código SKU, Part Number o código de parte del producto.",
                },
                nombre: {
                  type: Type.STRING,
                  description: "Nombre comercial del producto.",
                },
                marca: {
                  type: Type.STRING,
                  description: "Marca comercial o fabricante del producto detectado en el documento (ej: LYC, PAI, CATERPILLAR, CUMMINS, ISUZU, MACK, etc.).",
                },
                categoria: {
                  type: Type.STRING,
                  description: "Categoría, línea o sublínea donde está agrupado el producto en el PDF.",
                },
                descripcion: {
                  type: Type.STRING,
                  description: "Detalles técnicos o descripción del producto.",
                },
                precio: {
                  type: Type.NUMBER,
                  description: "Precio unitario del producto.",
                },
                stock: {
                  type: Type.INTEGER,
                  description: "Cantidad de unidades o stock disponible.",
                },
              },
              required: ["codigoSku", "nombre", "categoria", "precio"],
            },
          },
        },
        required: ["productos"],
      },
    };

    const modelosIntentar = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash"];
    let response;
    let ultimoError: any = null;

    for (const model of modelosIntentar) {
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config,
        });
        if (response) {
          break;
        }
      } catch (err: any) {
        ultimoError = err;
        console.warn(`[Gemini PDF Agent] Error o alta demanda con ${model}:`, err?.message || err);
      }
    }

    if (!response) {
      throw new Error(ultimoError?.message || "No fue posible procesar el documento con los modelos de Gemini disponibles.");
    }

    const responseText = response.text?.trim() || "{}";
    const data = JSON.parse(responseText);

    if (!Array.isArray(data.productos)) {
      throw new Error("La respuesta estructurada de Gemini no incluyó el arreglo de productos.");
    }

    return data.productos.map((item: any, index: number): ProductoExtraido => {
      const precioNum = Number(item.precio);
      const precioValido = !isNaN(precioNum) && precioNum > 0 ? precioNum.toFixed(2) : "0.00";
      const stockValido = Number.isInteger(item.stock) && item.stock >= 0 ? item.stock : 10;

      return {
        idTemp: `gemini-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
        codigoSku: String(item.codigoSku || `SKU-${index + 1}`).trim().toUpperCase(),
        nombre: String(item.nombre || "Producto sin nombre").trim(),
        marca: item.marca && String(item.marca).trim() ? String(item.marca).trim().toUpperCase() : "LYC",
        descripcion: String(item.descripcion || `Extraído con Agente Gemini de ${opciones.fileName}`).trim(),
        categoria: String(item.categoria || "General").trim(),
        precio: precioValido,
        stockActual: stockValido,
      };
    });
  } catch (geminiError: any) {
    console.error("Error en extracción con Gemini:", geminiError);
    throw geminiError;
  }
}