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
  Edit3
} from "lucide-react";
import { type Producto } from "@/db/schema";

interface ProductoExtraido {
  idTemp: string;
  codigoSku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: string;
  stockActual: number;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("Todas");
  
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State para nuevo producto individual
  const [form, setForm] = useState({
    codigoSku: "",
    nombre: "",
    descripcion: "",
    categoria: "Computación",
    precio: "",
    stockActual: "10",
  });

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
          descripcion: "",
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

    const formData = new FormData();
    formData.append("pdf", file);

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

  const categorias = ["Todas", ...Array.from(new Set(productos.map((p) => p.categoria)))];

  const productosFiltrados = productos.filter((p) => {
    const coincideTexto =
      p.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      p.codigoSku.toLowerCase().includes(filtro.toLowerCase()) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(filtro.toLowerCase()));

    const coincideCategoria =
      categoriaSeleccionada === "Todas" || p.categoria === categoriaSeleccionada;

    return coincideTexto && coincideCategoria;
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

        <div className="flex items-center gap-3">
          {/* Botón Importar Catálogo PDF */}
          <button
            onClick={() => {
              setProductosExtraidos([]);
              setPdfFile(null);
              setErrorPdf(null);
              setIsPdfModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-blue-500/20 transition"
          >
            <FileUp className="w-4 h-4" />
            <span>Importar Catálogo (PDF)</span>
          </button>

          {/* Botón Nuevo Producto */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por SKU, nombre o descripción..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
          />
        </div>

        {/* Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaSeleccionada(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                categoriaSeleccionada === cat
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
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
                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-purple-100">
                      <Tag className="w-3 h-3" />
                      {producto.categoria}
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-400">
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
                        <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                        <p className="text-sm font-bold text-slate-800">
                          Analizando documento y extrayendo productos...
                        </p>
                        <p className="text-xs text-slate-400">
                          Leyendo tablas, identificando códigos SKU, nombres y precios.
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
                      <span>¿Cómo funciona la extracción automática?</span>
                    </p>
                    <p className="text-slate-500 leading-relaxed">
                      El sistema analiza el contenido del PDF reconociendo columnas de SKU, descripción, precios en cualquier divisa ($ o Bs) y cantidades. Antes de guardar, podrás revisar cada ítem en una tabla de confirmación.
                    </p>
                  </div>
                </div>
              )}

              {/* Previsualización y Edición de Productos Extraídos */}
              {productosExtraidos.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs font-bold text-blue-900">
                          Se detectaron {productosExtraidos.length} productos en "{pdfFile?.name}"
                        </p>
                        <p className="text-[11px] text-blue-700">
                          Verifica o ajusta los valores directamente en la tabla antes de sincronizar con Neon.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setProductosExtraidos([]);
                        setPdfFile(null);
                      }}
                      className="text-xs text-blue-700 hover:text-blue-900 font-semibold underline"
                    >
                      Subir otro archivo
                    </button>
                  </div>

                  {/* Tabla Editable */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Código SKU</th>
                            <th className="py-2.5 px-3">Nombre del Producto</th>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Código SKU *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: TECH-LAP-002"
                    value={form.codigoSku}
                    onChange={(e) => setForm({ ...form, codigoSku: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm uppercase text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Computación, Redes..."
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600"
                  />
                </div>
              </div>

              <div>
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
