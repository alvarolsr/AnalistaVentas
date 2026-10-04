"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  Tag, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  FileUp,
  FileText,
  Trash2,
  Sparkles,
  RefreshCw,
  Edit3,
  Bot,
  Key,
  FileSpreadsheet,
  Download,
  ArrowUpDown
} from "lucide-react";
import { type Producto } from "@/db/schema";

interface ProductoExtraido {
  idTemp: string;
  codigoSku: string;
  nombre: string;
  marca?: string;
  descripcion: string;
  categoria: string;
  precio: string;
  stockActual: number;
}

function parseCsv(rawText: string, defaultMarca: "LYC" | "PAI" = "LYC"): ProductoExtraido[] {
  // Eliminar BOM de UTF-8 que suele agregar Excel
  const text = rawText.replace(/^\uFEFF/, "").trim();
  if (!text) {
    throw new Error("El archivo CSV está vacío.");
  }

  // Detectar delimitador analizando una muestra de las primeras 20 líneas
  const nonBlankLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const sample = nonBlankLines.slice(0, 20).join("\n");
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  const tabs = (sample.match(/\t/g) || []).length;

  let delimiter = ",";
  if (semicolons > commas && semicolons > tabs) delimiter = ";";
  else if (tabs > commas && tabs > semicolons) delimiter = "\t";

  // Parsear filas respetando comillas
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentField.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    throw new Error("El archivo CSV debe tener al menos una fila de encabezados y una fila con datos.");
  }

  // Caso muy común en hojas de cálculo (Excel):
  // El encabezado completo se pegó en una sola celda A1 usando comas, pero el CSV se exportó con punto y coma (o viceversa)
  if (rows.length > 0) {
    const nonEmptyHeaders = rows[0].filter((c) => c.trim().length > 0);
    if (nonEmptyHeaders.length === 1) {
      const singleHeaderCell = nonEmptyHeaders[0];
      const otherDelim = delimiter === ";" ? "," : ";";
      if (singleHeaderCell.includes(otherDelim)) {
        rows[0] = singleHeaderCell.split(otherDelim).map((c) => c.trim().replace(/^"+|"+$/g, ""));
      }
    }
  }

  // Normalizar encabezados (quitar acentos, minúsculas)
  const headers = rows[0].map((h) =>
    h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "").trim()
  );

  const getColIndex = (patterns: RegExp[]) => {
    return headers.findIndex((h) => patterns.some((p) => p.test(h)));
  };

  const skuIdx = getColIndex([/^sku$/, /^codigo/, /part.*number/, /^id$/]);
  const nombreIdx = getColIndex([/^nombre/, /^producto/, /^titulo/, /^item/, /^articulo/, /^desc/]);
  const marcaIdx = getColIndex([/^marca/, /^brand/, /^fabricante/]);
  const catIdx = getColIndex([/^subcategoria/, /^subcat/, /^categoria/, /^category/, /^rubro/, /^linea/, /^familia/]);
  const precioIdx = getColIndex([/^precio/, /^price/, /^costo/, /^valor/, /^monto/, /^pvp/]);
  const stockIdx = getColIndex([/^stock/, /^cantidad/, /^cant/, /^inventario/, /^existencia/]);
  const descIdx = getColIndex([/^descripcion/, /^description/, /^detalle/, /^especific/]);

  if (nombreIdx === -1 && skuIdx === -1) {
    throw new Error("No se identificaron columnas de 'Nombre' o 'Código SKU' en los encabezados del CSV.");
  }

  const productos: ProductoExtraido[] = [];
  let contadorAuto = 1;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.every((col) => !col || col.trim().length === 0)) continue;

    const rawSku = skuIdx !== -1 ? (row[skuIdx] || "") : "";
    const rawNombre = nombreIdx !== -1 ? (row[nombreIdx] || "") : "";
    const rawMarca = marcaIdx !== -1 ? (row[marcaIdx] || "") : "";
    const rawCat = catIdx !== -1 ? (row[catIdx] || "") : "";
    let rawPrecio = precioIdx !== -1 ? (row[precioIdx] || "") : "";
    let rawStock = stockIdx !== -1 ? (row[stockIdx] || "") : "";
    const rawDesc = descIdx !== -1 ? (row[descIdx] || "") : "";

    if (!rawNombre && !rawSku) continue;

    // Autocorrección inteligente si las columnas stock y precio vienen invertidas:
    // (Ejemplo: stock tiene decimales '42,37' y precio es entero '20')
    if (
      rawStock &&
      /[.,]\d{1,2}$/.test(rawStock.trim()) &&
      (!rawPrecio || /^\d+$/.test(rawPrecio.trim()))
    ) {
      const temp = rawStock;
      rawStock = rawPrecio;
      rawPrecio = temp;
    }

    // Normalizar precio
    let cleanPrecio = (rawPrecio || "").replace(/[$€Bs.\s]/g, "");
    if (rawPrecio.includes(",") && !rawPrecio.includes(".")) {
      cleanPrecio = rawPrecio.replace(/[$€Bs.\s]/g, "").replace(",", ".");
    } else if (rawPrecio.includes(".") && rawPrecio.includes(",")) {
      cleanPrecio = rawPrecio.replace(/[$€Bs.\s]/g, "").replace(/\./g, "").replace(",", ".");
    }
    const precioNum = parseFloat(cleanPrecio);
    const precioValido = !isNaN(precioNum) && precioNum >= 0 ? precioNum.toFixed(2) : "0.00";

    // Normalizar stock
    const stockNum = parseInt((rawStock || "").replace(/\D/g, ""), 10);
    const stockValido = !isNaN(stockNum) && stockNum >= 0 ? stockNum : 10;

    // Marca dinámica (CATERPILLAR, CUMMINS, ISUZU, MAHLE, LYC, etc.)
    const marcaFinal = rawMarca && rawMarca.trim() ? rawMarca.trim().toUpperCase() : defaultMarca;

    const skuFinal = rawSku.trim().toUpperCase() || `SKU-CSV-${String(contadorAuto).padStart(3, "0")}`;
    contadorAuto++;

    productos.push({
      idTemp: `csv-${Date.now()}-${r}-${Math.random().toString(36).substring(2, 6)}`,
      codigoSku: skuFinal,
      nombre: rawNombre.trim() || `Producto ${skuFinal}`,
      marca: marcaFinal,
      categoria: rawCat.trim() || "General",
      precio: precioValido,
      stockActual: stockValido,
      descripcion: rawDesc.trim() || "Importado desde archivo CSV",
    });
  }

  return productos;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [categoriasArbol, setCategoriasArbol] = useState<any[]>([]);
  const [categoriaPrincipalSeleccionada, setCategoriaPrincipalSeleccionada] = useState<string>("Todas");
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState<string>("Todas");
  const [ordenSku, setOrdenSku] = useState<"sku-asc" | "sku-desc" | "nombre" | "recientes">("sku-asc");
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  // PDF Import State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [productosExtraidos, setProductosExtraidos] = useState<ProductoExtraido[]>([]);
  const [guardandoBatch, setGuardandoBatch] = useState(false);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const [motorUtilizado, setMotorUtilizado] = useState<"gemini" | "heuristico" | null>(null);
  const [apiKeyGemini, setApiKeyGemini] = useState<string>("");
  const [mostrarConfigApiKey, setMostrarConfigApiKey] = useState(false);
  const [marcaPredeterminada, setMarcaPredeterminada] = useState<"LYC" | "PAI">("LYC");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [procesandoCsv, setProcesandoCsv] = useState(false);
  const [productosCsvExtraidos, setProductosCsvExtraidos] = useState<ProductoExtraido[]>([]);
  const [guardandoCsvBatch, setGuardandoCsvBatch] = useState(false);
  const [errorCsv, setErrorCsv] = useState<string | null>(null);
  const [marcaPredeterminadaCsv, setMarcaPredeterminadaCsv] = useState<"LYC" | "PAI">("LYC");
  const [categoriaPrincipalCsv, setCategoriaPrincipalCsv] = useState<string>("FRENO LYC");
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Form State para nuevo producto individual
  const [form, setForm] = useState({
    codigoSku: "",
    nombre: "",
    marca: "LYC",
    descripcion: "",
    categoriaPrincipal: "FRENO LYC",
    categoria: "BANDA",
    precio: "",
    stockActual: "10",
  });

  const fetchCategorias = async () => {
    try {
      const res = await fetch("/api/categorias");
      const data = await res.json();
      if (data.exito && data.categorias) {
        setCategoriasArbol(data.categorias);
      }
    } catch (err) {
      console.error("Error al cargar árbol de categorías:", err);
    }
  };

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/productos");
      const json = await res.json();
      setProductos(json);
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, []);

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          codigoSku: "",
          nombre: "",
          marca: "LYC",
          descripcion: "",
          categoriaPrincipal: "FRENO LYC",
          categoria: "Computación",
          precio: "",
          stockActual: "10",
        });
        setAlerta("Producto añadido al portafolio");
        setTimeout(() => setAlerta(null), 4000);
        fetchProductos();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al crear producto");
      }
    } catch (err) {
      console.error(err);
      alert("Error en la solicitud");
    } finally {
      setGuardando(false);
    }
  };

  // Procesar archivo PDF
  const handleProcesarArchivo = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setErrorPdf("El archivo seleccionado debe ser un documento en formato PDF.");
      return;
    }

    setPdfFile(file);
    setProcesandoPdf(true);
    setErrorPdf(null);
    setMotorUtilizado(null);

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("marca", marcaPredeterminada);
    if (apiKeyGemini.trim()) {
      formData.append("apiKey", apiKeyGemini.trim());
    }

    try {
      const res = await fetch("/api/productos/importar-pdf", {
        method: "POST",
        body: formData,
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error("El servidor no pudo procesar el documento PDF.");
      }

      if (res.ok) {
        if (data.productos && data.productos.length > 0) {
          setProductosExtraidos(data.productos);
          setMotorUtilizado(data.motor || "heuristico");
        } else {
          setErrorPdf("No se detectaron filas de productos con precios en el PDF. Intenta con una lista de precios o catálogo con precios visibles.");
        }
      } else {
        setErrorPdf(data.error || "Error al procesar el archivo PDF.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorPdf(err.message || "Ocurrió un error al procesar el PDF.");
    } finally {
      setProcesandoPdf(false);
    }
  };

  // Guardar productos extraídos en la base de datos
  const handleGuardarProductosBatch = async () => {
    if (productosExtraidos.length === 0) return;

    setGuardandoBatch(true);
    try {
      const res = await fetch("/api/productos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productos: productosExtraidos }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsPdfModalOpen(false);
        setProductosExtraidos([]);
        setPdfFile(null);
        setAlerta(data.mensaje || `¡${data.importados} productos importados a la base de datos exitosamente!`);
        setTimeout(() => setAlerta(null), 5000);
        fetchProductos();
      } else {
        alert(data.error || "Error al guardar los productos");
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar en el servidor");
    } finally {
      setGuardandoBatch(false);
    }
  };

  const handleActualizarFila = (idTemp: string, campo: keyof ProductoExtraido, valor: any) => {
    setProductosExtraidos((prev) =>
      prev.map((item) => (item.idTemp === idTemp ? { ...item, [campo]: valor } : item))
    );
  };

  const handleEliminarFila = (idTemp: string) => {
    setProductosExtraidos((prev) => prev.filter((item) => item.idTemp !== idTemp));
  };

  // Procesar archivo CSV
  const handleProcesarArchivoCsv = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && !file.type.includes("csv")) {
      setErrorCsv("El archivo seleccionado debe ser un archivo en formato .csv.");
      return;
    }

    setCsvFile(file);
    setProcesandoCsv(true);
    setErrorCsv(null);

    try {
      const text = await file.text();
      const extraidos = parseCsv(text, marcaPredeterminadaCsv);
      if (extraidos.length === 0) {
        setErrorCsv("No se encontraron registros de productos válidos en el archivo CSV.");
      } else {
        setProductosCsvExtraidos(extraidos);
      }
    } catch (err: any) {
      console.error(err);
      setErrorCsv(err.message || "Error al procesar el archivo CSV.");
    } finally {
      setProcesandoCsv(false);
    }
  };

  // Guardar productos CSV en la base de datos
  const handleGuardarProductosCsvBatch = async () => {
    if (productosCsvExtraidos.length === 0) return;

    setGuardandoCsvBatch(true);
    try {
      const res = await fetch("/api/productos/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          productos: productosCsvExtraidos,
          categoriaPrincipal: categoriaPrincipalCsv,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsCsvModalOpen(false);
        setProductosCsvExtraidos([]);
        setCsvFile(null);
        setAlerta(data.mensaje || `¡${data.importados} productos importados desde CSV exitosamente!`);
        setTimeout(() => setAlerta(null), 5000);
        fetchProductos();
      } else {
        alert(data.error || "Error al guardar los productos");
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar en el servidor");
    } finally {
      setGuardandoCsvBatch(false);
    }
  };

  const handleActualizarFilaCsv = (idTemp: string, campo: keyof ProductoExtraido, valor: any) => {
    setProductosCsvExtraidos((prev) =>
      prev.map((item) => (item.idTemp === idTemp ? { ...item, [campo]: valor } : item))
    );
  };

  const handleEliminarFilaCsv = (idTemp: string) => {
    setProductosCsvExtraidos((prev) => prev.filter((item) => item.idTemp !== idTemp));
  };

  const handleDescargarPlantillaCsv = () => {
    const encabezados = "codigo_sku,nombre,marca,subcategoria,precio,stock_actual,descripcion\r\n";
    const filasEjemplo = [
      "PAI-COMP-001,Compresor de Aire 2HP,PAI,COMPRESOR,350.00,15,Compresor monofasico para taller",
      "LYC-FILT-002,Filtro de Aceite Industrial,LYC,FILTRO ACEITE,28.50,40,Filtro de alta eficiencia para maquinaria",
      "PAI-VALV-003,Valvula Reguladora de Presion,PAI,VALVULA FRENO,85.00,20,Valvula de seguridad en acero inoxidable",
      "LYC-MANG-004,Manguera Hidraulica 1/2 pulgada,LYC,MANGUERA - FRENO,45.00,25,Manguera de alta presion 5000 PSI",
    ].join("\r\n");

    const blob = new Blob([encabezados + filasEjemplo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Plantilla_Productos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const categoriasPrincipalesDisponibles = ["Todas", ...categoriasArbol.map((c) => c.nombre)];

  const subcategoriasDisponibles = (() => {
    if (categoriaPrincipalSeleccionada === "Todas") {
      const todasSub = new Set<string>();
      categoriasArbol.forEach((p) => p.subcategorias?.forEach((s: any) => todasSub.add(s.nombre)));
      productos.forEach((p) => { if (p.categoria) todasSub.add(p.categoria); });
      return ["Todas", ...Array.from(todasSub).sort()];
    }
    const catPadre = categoriasArbol.find((c) => c.nombre === categoriaPrincipalSeleccionada);
    if (!catPadre || !catPadre.subcategorias) return ["Todas"];
    return ["Todas", ...catPadre.subcategorias.map((s: any) => s.nombre).sort()];
  })();

  const productosFiltrados = productos
    .filter((p: any) => {
      const coincideTexto =
        p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        p.codigoSku.toLowerCase().includes(filtro.toLowerCase()) ||
        (p.marca && p.marca.toLowerCase().includes(filtro.toLowerCase())) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(filtro.toLowerCase()));

      const coincidePrincipal =
        categoriaPrincipalSeleccionada === "Todas" ||
        p.categoriaPrincipalNombre === categoriaPrincipalSeleccionada;

      const coincideSubcategoria =
        subcategoriaSeleccionada === "Todas" ||
        p.categoria?.toUpperCase() === subcategoriaSeleccionada.toUpperCase();

      return coincideTexto && coincidePrincipal && coincideSubcategoria;
    })
    .sort((a: any, b: any) => {
      if (ordenSku === "sku-asc") {
        return (a.codigoSku || "").localeCompare(b.codigoSku || "", undefined, { numeric: true, sensitivity: "base" });
      }
      if (ordenSku === "sku-desc") {
        return (b.codigoSku || "").localeCompare(a.codigoSku || "", undefined, { numeric: true, sensitivity: "base" });
      }
      if (ordenSku === "nombre") {
        return (a.nombre || "").localeCompare(b.nombre || "", undefined, { sensitivity: "base" });
      }
      const fechaA = a.creadoEn ? new Date(a.creadoEn).getTime() : 0;
      const fechaB = b.creadoEn ? new Date(b.creadoEn).getTime() : 0;
      return fechaB - fechaA;
    });

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("es-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-600" />
            <span>Portafolio de Productos</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Catálogo comercial, niveles de inventario en tiempo real y precios unitarios.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Botón Importar Catálogo PDF */}
          <button
            onClick={() => {
              setProductosExtraidos([]);
              setPdfFile(null);
              setErrorPdf(null);
              setIsPdfModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm shadow-blue-500/20 transition whitespace-nowrap"
          >
            <FileUp className="w-4 h-4 shrink-0" />
            <span>Importar Catálogo (PDF)</span>
          </button>

          {/* Botón Importar CSV */}
          <button
            onClick={() => {
              setProductosCsvExtraidos([]);
              setCsvFile(null);
              setErrorCsv(null);
              setIsCsvModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm shadow-emerald-500/20 transition whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Importar CSV</span>
          </button>

          {/* Botón Nuevo Producto */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-sm transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {alerta && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{alerta}</span>
        </div>
      )}

      {/* Filtros y Buscador */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por SKU, nombre, marca o descripción..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de Categoría Principal */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 shrink-0">Categoría Principal:</span>
              <select
                value={categoriaPrincipalSeleccionada}
                onChange={(e) => {
                  setCategoriaPrincipalSeleccionada(e.target.value);
                  setSubcategoriaSeleccionada("Todas");
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 shadow-2xs focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 cursor-pointer"
              >
                {categoriasPrincipalesDisponibles.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "Todas" ? "Todas las Categorías Principales" : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de Orden */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-purple-600" />
                Ordenar:
              </span>
              <select
                value={ordenSku}
                onChange={(e) => setOrdenSku(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 shadow-2xs focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 cursor-pointer"
              >
                <option value="sku-asc">SKU (A - Z)</option>
                <option value="sku-desc">SKU (Z - A)</option>
                <option value="nombre">Nombre (A - Z)</option>
                <option value="recientes">Más recientes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fila de Subcategorías (Chips horizontales) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
          <span className="text-slate-400 font-semibold shrink-0 mr-1 text-[11px] uppercase tracking-wider">Subcategorías:</span>
          {subcategoriasDisponibles.slice(0, 16).map((sub) => (
            <button
              key={sub}
              onClick={() => setSubcategoriaSeleccionada(sub)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                subcategoriaSeleccionada === sub
                  ? "bg-purple-600 text-white shadow-xs font-bold"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {sub}
            </button>
          ))}
          {subcategoriasDisponibles.length > 16 && (
            <select
              value={subcategoriasDisponibles.slice(16).includes(subcategoriaSeleccionada) ? subcategoriaSeleccionada : ""}
              onChange={(e) => {
                if (e.target.value) setSubcategoriaSeleccionada(e.target.value);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2 py-1 shrink-0 cursor-pointer"
            >
              <option value="">Más subcategorías ({subcategoriasDisponibles.length - 16})...</option>
              {subcategoriasDisponibles.slice(16).map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Grid de Productos */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Cargando portafolio...</div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No se encontraron productos</p>
          <p className="text-xs text-slate-400 mt-1">Registra productos o importa un catálogo PDF para comenzar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {productosFiltrados.map((producto) => {
            const stockBajo = producto.stockActual <= 10;
            return (
              <div
                key={producto.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(producto as any).categoriaPrincipalNombre && (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border border-indigo-100">
                          {(producto as any).categoriaPrincipalNombre}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border border-purple-100">
                        <Tag className="w-3 h-3" />
                        {producto.categoria}
                      </span>
                      {producto.marca && (
                        <span className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-semibold border border-slate-200">
                          {producto.marca}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-500 whitespace-nowrap shrink-0 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60">
                      {producto.codigoSku}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-3">{producto.nombre}</h3>
                  {producto.descripcion && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {producto.descripcion}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-end justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Precio Unitario</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {formatCurrency(producto.precio)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Inventario</span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        stockBajo
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {stockBajo && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      {producto.stockActual} en stock
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: IMPORTAR CATÁLOGO DESDE PDF */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl animate-fade-in relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Importación Automática desde PDF</h2>
                  <p className="text-xs text-slate-500">
                    Carga una lista de precios o catálogo para extraer y poblar productos automáticamente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Zona de Carga si no hay productos extraídos aún */}
              {productosExtraidos.length === 0 && (
                <div className="space-y-4">
                  {/* Banner Agente Gemini AI */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-xl shadow-sm shadow-indigo-500/20 shrink-0">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900">
                            Agente Gemini AI Multimodal
                          </h3>
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-full uppercase">
                            Inteligente
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Identifica visualmente categorías, marcas, códigos SKU y precios exactos en catálogos y listas complejas.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMostrarConfigApiKey(!mostrarConfigApiKey)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5 self-start sm:self-auto shrink-0 bg-white/80 hover:bg-white border border-indigo-200/80 px-3 py-1.5 rounded-lg transition"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{apiKeyGemini ? "API Key activa" : "Configurar API Key"}</span>
                    </button>
                  </div>

                  {/* Input opcional para API Key si no está en .env */}
                  {mostrarConfigApiKey && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs animate-fade-in">
                      <label className="block font-semibold text-slate-700">
                        Google Gemini API Key (Opcional si ya está en .env.local):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="AIzaSy..."
                          value={apiKeyGemini}
                          onChange={(e) => setApiKeyGemini(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarConfigApiKey(false)}
                          className="px-3 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                        >
                          Aplicar
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Si tienes `GEMINI_API_KEY` en tu archivo `.env.local` o variables de Vercel, el servidor la detectará automáticamente.
                      </p>
                    </div>
                  )}

                  {/* Selector de marca para el PDF */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">Marca a asignar a este catálogo:</span>
                      <span className="text-slate-500 text-[11px]">Selecciona si los productos del documento pertenecen a LYC o PAI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMarcaPredeterminada("LYC")}
                        className={`px-4 py-1.5 rounded-lg font-bold text-xs transition ${
                          marcaPredeterminada === "LYC"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        LYC
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarcaPredeterminada("PAI")}
                        className={`px-4 py-1.5 rounded-lg font-bold text-xs transition ${
                          marcaPredeterminada === "PAI"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        PAI
                      </button>
                    </div>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleProcesarArchivo(file);
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-slate-50"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcesarArchivo(file);
                      }}
                    />

                    {procesandoPdf ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
                        <p className="text-sm font-bold text-slate-800">
                          Agente Gemini analizando documento PDF...
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Detectando jerarquías visuales, agrupaciones por categoría, marcas, códigos SKU y precios unitarios.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-blue-100/70 text-blue-600 rounded-full">
                          <FileText className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Arrastra tu archivo PDF aquí o haz clic para seleccionarlo
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Formatos soportados: Catálogos, listas de precios y cotizaciones estructuradas (.pdf)
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {errorPdf && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorPdf}</span>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>¿Cómo funciona la extracción inteligente?</span>
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      El Agente Gemini analiza la disposición y maquetación de cada página, deduciendo qué productos pertenecen a cada familia o sublínea (ej. Servidores, Redes, Laptops), reconociendo la marca y aislando códigos SKU auténticos. Si no hay conexión con IA, la aplicación activa un respaldo heurístico para que nunca te quedes sin procesar tu archivo.
                    </p>
                  </div>
                </div>
              )}

              {/* Previsualización y Edición de Productos Extraídos */}
              {productosExtraidos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-blue-900">
                            Se detectaron {productosExtraidos.length} productos en "{pdfFile?.name}"
                          </p>
                          {motorUtilizado === "gemini" ? (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow-xs">
                              <Bot className="w-3 h-3" />
                              <span>Gemini AI</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-full">
                              Motor Heurístico
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-blue-700">
                          {motorUtilizado === "gemini"
                            ? "Categorías, SKUs y marcas estructurados con precisión por el Agente Gemini. Puedes afinar cualquier dato antes de guardar."
                            : "Verifica o ajusta los valores directamente en la tabla antes de sincronizar con Neon."}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setProductosExtraidos([]);
                        setPdfFile(null);
                        setMotorUtilizado(null);
                      }}
                      className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline shrink-0"
                    >
                      Subir otro archivo
                    </button>
                  </div>

                  {/* Acciones Rápidas de Marca Masiva */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs">
                    <span className="text-slate-600 font-medium">Asignar marca a todos los productos extraídos:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProductosExtraidos((prev) => prev.map((p) => ({ ...p, marca: "LYC" })))}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-lg shadow-xs transition"
                      >
                        Asignar LYC a todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductosExtraidos((prev) => prev.map((p) => ({ ...p, marca: "PAI" })))}
                        className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-lg shadow-xs transition"
                      >
                        Asignar PAI a todos
                      </button>
                    </div>
                  </div>

                  {/* Tabla Editable */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Código SKU</th>
                            <th className="py-2.5 px-3">Nombre del Producto</th>
                            <th className="py-2.5 px-3 w-24">Marca</th>
                            <th className="py-2.5 px-3">Categoría</th>
                            <th className="py-2.5 px-3 w-28">Precio ($)</th>
                            <th className="py-2.5 px-3 w-20">Stock</th>
                            <th className="py-2.5 px-3 text-right">Quitar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {productosExtraidos.map((item) => (
                            <tr key={item.idTemp} className="hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.codigoSku}
                                  onChange={(e) =>
                                    handleActualizarFila(item.idTemp, "codigoSku", e.target.value.toUpperCase())
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono uppercase font-semibold text-slate-800"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.nombre}
                                  onChange={(e) =>
                                    handleActualizarFila(item.idTemp, "nombre", e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-900"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={item.marca === "PAI" ? "PAI" : "LYC"}
                                  onChange={(e) =>
                                    handleActualizarFila(item.idTemp, "marca", e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-900 font-bold text-xs focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="LYC">LYC</option>
                                  <option value="PAI">PAI</option>
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.categoria}
                                  onChange={(e) =>
                                    handleActualizarFila(item.idTemp, "categoria", e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-700"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.precio}
                                  onChange={(e) =>
                                    handleActualizarFila(item.idTemp, "precio", e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-bold text-slate-900"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.stockActual}
                                  onChange={(e) =>
                                    handleActualizarFila(item.idTemp, "stockActual", parseInt(e.target.value) || 0)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-center font-semibold text-slate-800"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleEliminarFila(item.idTemp)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                  title="Quitar fila"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer de acción */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                {productosExtraidos.length > 0
                  ? `${productosExtraidos.length} productos listos para sincronizar`
                  : "Selecciona un archivo para continuar"}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>

                {productosExtraidos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleGuardarProductosBatch}
                    disabled={guardandoBatch}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {guardandoBatch
                        ? "Sincronizando con Neon..."
                        : `Guardar en Base de Datos (${productosExtraidos.length})`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CSV: IMPORTACIÓN MASIVA DESDE CSV */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl animate-fade-in relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Importación Masiva desde Archivo CSV</h2>
                  <p className="text-xs text-slate-500">
                    Carga un archivo separado por comas o punto y coma (.csv) para registrar o actualizar productos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setProductosCsvExtraidos([]);
                  setCsvFile(null);
                  setErrorCsv(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Zona de Carga si no hay productos extraídos aún */}
              {productosCsvExtraidos.length === 0 && (
                <div className="space-y-4">
                  {/* Banner de Ayuda y Descarga de Plantilla */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm shadow-emerald-500/20 shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900">
                            Estructura de Columnas Sugerida
                          </h3>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-extrabold rounded-full uppercase">
                            CSV estándar
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Detecta columnas automáticamente: <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">codigo_sku</code>, <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">nombre</code>, <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">marca (LYC/PAI)</code>, <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">subcategoria</code>, <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">precio</code>, <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px] text-slate-700">stock</code>.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDescargarPlantillaCsv}
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1.5 self-start sm:self-auto shrink-0 bg-white hover:bg-emerald-50/50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar Plantilla CSV</span>
                    </button>
                  </div>

                  {/* Selectores de Marca y Categoría Principal para el CSV */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">Marca predeterminada:</span>
                        <span className="text-slate-500 text-[11px]">Se asignará si alguna fila del CSV no contiene marca</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setMarcaPredeterminadaCsv("LYC")}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition ${
                            marcaPredeterminadaCsv === "LYC"
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          LYC
                        </button>
                        <button
                          type="button"
                          onClick={() => setMarcaPredeterminadaCsv("PAI")}
                          className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition ${
                            marcaPredeterminadaCsv === "PAI"
                              ? "bg-purple-600 text-white shadow-xs"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          PAI
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block">Categoría Principal asignada:</span>
                        <span className="text-slate-500 text-[11px]">Línea a la que pertenecerán los productos importados</span>
                      </div>
                      <div className="mt-1">
                        <select
                          value={categoriaPrincipalCsv}
                          onChange={(e) => setCategoriaPrincipalCsv(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-3 py-2 shadow-2xs focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 cursor-pointer"
                        >
                          {categoriasArbol.map((cat) => (
                            <option key={cat.id} value={cat.nombre}>
                              {cat.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onClick={() => csvFileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleProcesarArchivoCsv(file);
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 bg-slate-50"
                  >
                    <input
                      ref={csvFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcesarArchivoCsv(file);
                      }}
                    />

                    {procesandoCsv ? (
                      <div className="flex flex-col items-center gap-3 py-4">
                        <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                        <p className="text-sm font-bold text-slate-800">
                          Leyendo y procesando archivo CSV...
                        </p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Analizando estructura de columnas, normalizando marcas LYC/PAI y saneando precios y stock.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full">
                          <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Arrastra tu archivo CSV aquí o haz clic para seleccionarlo
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Soporta formatos delimitados por coma (,) o punto y coma (;) exportados desde Excel o ERPs
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {errorCsv && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{errorCsv}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Previsualización y Edición de Productos CSV */}
              {productosCsvExtraidos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-950">
                          {productosCsvExtraidos.length} productos detectados en {csvFile?.name}
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          Revisa, edita los campos que desees o ajusta las marcas antes de guardar definitivamente.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProductosCsvExtraidos([]);
                        setCsvFile(null);
                        setErrorCsv(null);
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-white px-3 py-1.5 rounded-lg shadow-2xs hover:bg-emerald-50 transition"
                    >
                      Subir otro archivo
                    </button>
                  </div>

                  {/* Acciones Rápidas Masivas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-slate-600 font-semibold">Marca para todos:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setProductosCsvExtraidos((prev) => prev.map((p) => ({ ...p, marca: "LYC" })))}
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-lg shadow-2xs transition"
                        >
                          LYC
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductosCsvExtraidos((prev) => prev.map((p) => ({ ...p, marca: "PAI" })))}
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-200 rounded-lg shadow-2xs transition"
                        >
                          PAI
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 sm:pl-3 pt-2 sm:pt-0">
                      <span className="text-slate-600 font-semibold shrink-0">Categoría Principal:</span>
                      <select
                        value={categoriaPrincipalCsv}
                        onChange={(e) => setCategoriaPrincipalCsv(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1 shadow-2xs focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 cursor-pointer"
                      >
                        {categoriasArbol.map((cat) => (
                          <option key={cat.id} value={cat.nombre}>
                            {cat.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Tabla Editable */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Código SKU</th>
                            <th className="py-2.5 px-3">Nombre del Producto</th>
                            <th className="py-2.5 px-3 w-28">Marca</th>
                            <th className="py-2.5 px-3">Subcategoría</th>
                            <th className="py-2.5 px-3 w-28">Precio ($)</th>
                            <th className="py-2.5 px-3 w-20">Stock</th>
                            <th className="py-2.5 px-3 text-right">Quitar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {productosCsvExtraidos.map((item) => (
                            <tr key={item.idTemp} className="hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.codigoSku}
                                  onChange={(e) =>
                                    handleActualizarFilaCsv(item.idTemp, "codigoSku", e.target.value.toUpperCase())
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono uppercase font-semibold text-slate-800"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.nombre}
                                  onChange={(e) =>
                                    handleActualizarFilaCsv(item.idTemp, "nombre", e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 font-medium"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={item.marca === "PAI" ? "PAI" : "LYC"}
                                  onChange={(e) =>
                                    handleActualizarFilaCsv(item.idTemp, "marca", e.target.value as "LYC" | "PAI")
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 font-bold focus:ring-1 focus:ring-purple-500"
                                >
                                  <option value="LYC">LYC</option>
                                  <option value="PAI">PAI</option>
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.categoria}
                                  onChange={(e) =>
                                    handleActualizarFilaCsv(item.idTemp, "categoria", e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.precio}
                                  onChange={(e) =>
                                    handleActualizarFilaCsv(item.idTemp, "precio", e.target.value)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-slate-800"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={item.stockActual}
                                  onChange={(e) =>
                                    handleActualizarFilaCsv(item.idTemp, "stockActual", parseInt(e.target.value) || 0)
                                  }
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-slate-800"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleEliminarFilaCsv(item.idTemp)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                                  title="Quitar fila"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal CSV */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
              <div className="text-xs text-slate-500">
                {productosCsvExtraidos.length > 0 ? (
                  <span>
                    Total: <strong className="text-slate-800">{productosCsvExtraidos.length}</strong> productos listos para importar
                  </span>
                ) : (
                  <span>Formatos soportados: archivos delimitados .csv</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setProductosCsvExtraidos([]);
                    setCsvFile(null);
                    setErrorCsv(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>

                {productosCsvExtraidos.length > 0 && (
                  <button
                    type="button"
                    onClick={handleGuardarProductosCsvBatch}
                    disabled={guardandoCsvBatch}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {guardandoCsvBatch
                        ? "Sincronizando con Neon..."
                        : `Guardar en Base de Datos (${productosCsvExtraidos.length})`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: NUEVO PRODUCTO INDIVIDUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Añadir Producto al Portafolio</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearProducto} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código SKU *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: BKLG-0020"
                    value={form.codigoSku}
                    onChange={(e) => setForm({ ...form, codigoSku: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm uppercase text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría Principal *
                  </label>
                  <select
                    value={form.categoriaPrincipal}
                    onChange={(e) => {
                      const nuevoPadre = e.target.value;
                      const catPadre = categoriasArbol.find((c) => c.nombre === nuevoPadre);
                      const primerHijo = catPadre?.subcategorias?.[0]?.nombre || "";
                      setForm({
                        ...form,
                        categoriaPrincipal: nuevoPadre,
                        categoria: primerHijo || form.categoria,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 cursor-pointer"
                  >
                    {categoriasArbol.map((cat) => (
                      <option key={cat.id} value={cat.nombre}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subcategoría *
                  </label>
                  <input
                    required
                    type="text"
                    list="lista-subcategorias"
                    placeholder="Ej: BANDA, PASTILLAS..."
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs uppercase font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                  <datalist id="lista-subcategorias">
                    {categoriasArbol
                      .find((c) => c.nombre === form.categoriaPrincipal)
                      ?.subcategorias?.map((sub: any) => (
                        <option key={sub.id} value={sub.nombre} />
                      ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: MacBook Pro 16 M3 Max"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca *
                  </label>
                  <select
                    required
                    value={form.marca}
                    onChange={(e) => setForm({ ...form, marca: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  >
                    <option value="LYC">LYC</option>
                    <option value="PAI">PAI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción Técnica / Comercial
                </label>
                <textarea
                  rows={2}
                  placeholder="Especificaciones clave del producto..."
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Precio Unitario ($ USD) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 850.00"
                    value={form.precio}
                    onChange={(e) => setForm({ ...form, precio: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Inicial Disponible *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="Ej: 15"
                    value={form.stockActual}
                    onChange={(e) => setForm({ ...form, stockActual: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
