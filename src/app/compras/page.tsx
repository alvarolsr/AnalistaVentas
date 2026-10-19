"use client";

import { useEffect, useState } from "react";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FileText, 
  X, 
  Trash2,
  Receipt,
  Calendar,
  UploadCloud,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  Building2,
  RefreshCw,
  Check,
  Eye,
  FileCheck,
  UserCheck,
  UserPlus,
  ChevronDown
} from "lucide-react";
import { type Cliente, type Producto } from "@/db/schema";
import { type CompraCompleta } from "@/db/service";
import { type ItemEnriquecido } from "@/app/api/compras/importar-pdf/route";

export default function ComprasPage() {
  const [compras, setCompras] = useState<CompraCompleta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  
  // Modal State Manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [compraDetalleSeleccionada, setCompraDetalleSeleccionada] = useState<CompraCompleta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [actualizandoEstadoId, setActualizandoEstadoId] = useState<string | null>(null);

  // Modal State Importar PDF
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);
  const [preClienteId, setPreClienteId] = useState<string>("");

  // Datos extraídos del PDF para edición/confirmación
  const [facturaPdfData, setFacturaPdfData] = useState<{
    motor: "gemini" | "heuristico";
    warning?: string | null;
    archivo: { nombre: string; tamano: number };
    factura: any;
    clienteSugerido: Cliente | null;
    resumenValidacion: any;
  } | null>(null);

  // Campos editables del modal PDF
  const [editClienteId, setEditClienteId] = useState<string>("");
  const [modoCliente, setModoCliente] = useState<"existente" | "nuevo">("existente");
  const [editClienteNuevo, setEditClienteNuevo] = useState<{
    nombre: string;
    rif: string;
    empresa: string;
    direccion: string;
    telefono: string;
    email: string;
  }>({
    nombre: "",
    rif: "",
    empresa: "",
    direccion: "",
    telefono: "",
    email: "",
  });
  const [editNumeroFactura, setEditNumeroFactura] = useState<string>("");
  const [editFechaCompra, setEditFechaCompra] = useState<string>("");
  const [editMetodoPago, setEditMetodoPago] = useState<string>("transferencia");
  const [editEstado, setEditEstado] = useState<string>("completada");
  const [editNotas, setEditNotas] = useState<string>("");
  const [editItems, setEditItems] = useState<ItemEnriquecido[]>([]);
  const [guardandoPdfFactura, setGuardandoPdfFactura] = useState(false);

  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Form State para registrar nueva compra manual
  const [clienteId, setClienteId] = useState("");
  const [fechaCompra, setFechaCompra] = useState(getTodayString());
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [estado, setEstado] = useState("completada");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<
    Array<{ productoId: string; cantidad: number; precioUnitario: number }>
  >([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resCompras, resClientes, resProductos] = await Promise.all([
        fetch("/api/compras", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
        fetch("/api/productos", { cache: "no-store" }),
      ]);

      const [jsonCompras, jsonClientes, jsonProductos] = await Promise.all([
        resCompras.json(),
        resClientes.json(),
        resProductos.json(),
      ]);

      setCompras(jsonCompras);
      setClientes(jsonClientes);
      setProductos(jsonProductos);
    } catch (err) {
      console.error("Error al cargar datos de compras:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCompraDetalleSeleccionada(null);
        setIsModalOpen(false);
        setIsPdfModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCambiarEstado = async (compraId: string, nuevoEstado: string) => {
    try {
      setActualizandoEstadoId(compraId);
      const res = await fetch("/api/compras", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: compraId, estado: nuevoEstado }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar estado");
      }

      // Actualizar compras en el estado local
      setCompras((prev) =>
        prev.map((c) => (c.id === compraId ? { ...c, estado: nuevoEstado } : c))
      );

      // Si está abierta en el modal de detalle, actualizarla también
      setCompraDetalleSeleccionada((prev) =>
        prev && prev.id === compraId ? { ...prev, estado: nuevoEstado } : prev
      );

      setAlerta(`Estado de la compra actualizado a "${nuevoEstado}".`);
      setTimeout(() => setAlerta(null), 3500);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "No se pudo actualizar el estado de la compra.");
    } finally {
      setActualizandoEstadoId(null);
    }
  };

  const handleAddItem = (productoId: string) => {
    const prod = productos.find((p) => p.id === productoId);
    if (!prod) return;

    const existe = items.find((it) => it.productoId === productoId);
    if (existe) {
      setItems(
        items.map((it) =>
          it.productoId === productoId ? { ...it, cantidad: it.cantidad + 1 } : it
        )
      );
    } else {
      setItems([
        ...items,
        {
          productoId,
          cantidad: 1,
          precioUnitario: Number(prod.precio),
        },
      ]);
    }
  };

  const handleUpdateItemCantidad = (productoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      handleRemoveItem(productoId);
      return;
    }
    setItems(
      items.map((it) => (it.productoId === productoId ? { ...it, cantidad } : it))
    );
  };

  const handleRemoveItem = (productoId: string) => {
    setItems(items.filter((it) => it.productoId !== productoId));
  };

  const calcularTotal = () => {
    return items.reduce((acc, it) => acc + it.cantidad * it.precioUnitario, 0);
  };

  const handleRegistrarCompra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      alert("Por favor selecciona un cliente de la cartera.");
      return;
    }
    if (items.length === 0) {
      alert("Debes agregar al menos un producto a la compra.");
      return;
    }

    setGuardando(true);
    try {
      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          fechaCompra,
          metodoPago,
          estado,
          notas,
          items,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setClienteId("");
        setFechaCompra(getTodayString());
        setItems([]);
        setNotas("");
        setAlerta("Compra registrada con éxito");
        setTimeout(() => setAlerta(null), 4000);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al registrar la compra");
      }
    } catch (err) {
      console.error(err);
      alert("Error en la solicitud");
    } finally {
      setGuardando(false);
    }
  };

  // Procesamiento del PDF de factura o nota de entrega
  const handleProcessPdf = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErrorPdf("El archivo seleccionado debe ser un documento en formato PDF.");
      return;
    }

    setPdfFile(file);
    setProcesandoPdf(true);
    setErrorPdf(null);
    setFacturaPdfData(null);

    const formData = new FormData();
    formData.append("pdf", file);
    if (preClienteId) {
      formData.append("clienteId", preClienteId);
    }

    try {
      const res = await fetch("/api/compras/importar-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo procesar la factura en PDF.");
      }

      setFacturaPdfData(data);

      // Pre-cargar campos editables con lo detectado
      const clientMatchedId = data.clienteSugerido?.id || preClienteId || "";
      setEditClienteId(clientMatchedId);

      if (clientMatchedId) {
        setModoCliente("existente");
      } else {
        setModoCliente("nuevo");
        const detected = data.factura.clienteDetectado || {};
        setEditClienteNuevo({
          nombre: detected.nombre || "Cliente Nuevo",
          rif: detected.rif || "",
          empresa: detected.empresa || detected.nombre || "",
          direccion: detected.direccion || "",
          telefono: detected.telefono || "",
          email: "",
        });
      }

      setEditNumeroFactura(data.factura.numeroFactura || "");
      setEditFechaCompra(data.factura.fechaCompra || getTodayString());
      setEditMetodoPago(data.factura.metodoPago || "transferencia");
      setEditEstado(data.factura.metodoPago === "credito" ? "pendiente" : "completada");
      setEditNotas(data.factura.notas || "");
      setEditItems(data.factura.items || []);
    } catch (err: any) {
      console.error("Error al procesar PDF de compra:", err);
      setErrorPdf(err.message || "Ocurrió un error al procesar el archivo PDF.");
    } finally {
      setProcesandoPdf(false);
    }
  };

  const handleUpdatePdfItem = (index: number, field: keyof ItemEnriquecido, value: any) => {
    const updated = [...editItems];
    const item = { ...updated[index], [field]: value };
    if (field === "cantidad" || field === "precioUnitario") {
      item.subtotal = Number((item.cantidad * item.precioUnitario).toFixed(2));
    }
    updated[index] = item;
    setEditItems(updated);
  };

  const handleDeletePdfItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleAddBlankPdfItem = () => {
    setEditItems([
      ...editItems,
      {
        codigoSku: "NUEVO-SKU",
        nombre: "Nuevo Producto",
        cantidad: 1,
        precioUnitario: 0,
        subtotal: 0,
        enCatalogo: false,
      },
    ]);
  };

  const calcularTotalPdf = () => {
    return editItems.reduce((acc, it) => acc + (it.cantidad * it.precioUnitario), 0);
  };

  const handleConfirmarPdfCompra = async () => {
    if (modoCliente === "existente" && !editClienteId) {
      alert("Por favor selecciona o confirma el cliente correspondiente para esta factura.");
      return;
    }

    if (modoCliente === "nuevo" && !editClienteNuevo.nombre.trim()) {
      alert("Debes indicar el nombre o razón social del nuevo cliente a registrar.");
      return;
    }

    if (editItems.length === 0) {
      alert("La factura debe tener al menos un ítem o producto para ser guardada.");
      return;
    }

    setGuardandoPdfFactura(true);
    try {
      const payload: any = {
        numeroFactura: editNumeroFactura.trim(),
        fechaCompra: editFechaCompra,
        metodoPago: editMetodoPago,
        estado: editEstado,
        notas: editNotas.trim(),
        items: editItems.map((it) => ({
          productoId: it.productoId,
          codigoSku: it.codigoSku,
          nombre: it.nombre,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario,
        })),
      };

      if (modoCliente === "nuevo") {
        payload.clienteNuevo = editClienteNuevo;
      } else {
        payload.clienteId = editClienteId;
      }

      const res = await fetch("/api/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Error al insertar la factura en la base de datos.");
      }

      setIsPdfModalOpen(false);
      setFacturaPdfData(null);
      setPdfFile(null);
      setAlerta(
        modoCliente === "nuevo"
          ? `Nuevo cliente "${editClienteNuevo.nombre}" creado y compra registrada con éxito.`
          : `Factura N° ${editNumeroFactura} registrada con éxito.`
      );
      setTimeout(() => setAlerta(null), 5000);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Error al registrar la factura PDF");
    } finally {
      setGuardandoPdfFactura(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("es-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Number(amount));
  };

  const comprasFiltradas = compras.filter((c) => {
    const coincideTexto =
      c.numeroFactura.toLowerCase().includes(filtro.toLowerCase()) ||
      c.clienteNombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (c.clienteEmpresa && c.clienteEmpresa.toLowerCase().includes(filtro.toLowerCase()));

    const coincideEstado = estadoFiltro === "todos" || c.estado === estadoFiltro;

    return coincideTexto && coincideEstado;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            <span>Registro y Facturación de Compras</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control de órdenes de compra realizadas por clientes, emisión de comprobantes, métodos de pago y digitalización de facturas PDF.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Botón Cargar Factura PDF */}
          <button
            onClick={() => {
              setErrorPdf(null);
              setFacturaPdfData(null);
              setPdfFile(null);
              setPreClienteId("");
              setIsPdfModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Cargar Factura / Nota (PDF)</span>
            <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-200" />
              AI
            </span>
          </button>

          {/* Botón Registrar Manual */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Compra Manual</span>
          </button>
        </div>
      </div>

      {alerta && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{alerta}</span>
        </div>
      )}

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, factura o empresa..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {["todos", "completada", "pendiente", "cancelada"].map((st) => (
            <button
              key={st}
              onClick={() => setEstadoFiltro(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                estadoFiltro === st
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Compras */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Cargando compras...</div>
      ) : comprasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No hay compras registradas</p>
          <p className="text-xs text-slate-400 mt-1">Carga una factura PDF o registra una nueva venta para comenzar.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3.5 px-4">Comprobante</th>
                  <th className="py-3.5 px-4">Cliente / Empresa</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4">Método Pago</th>
                  <th className="py-3.5 px-4">Ítems</th>
                  <th className="py-3.5 px-4">Monto Total</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {comprasFiltradas.map((compra) => (
                  <tr key={compra.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-xs">
                      <span>{compra.numeroFactura}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{compra.clienteNombre}</p>
                      <p className="text-xs text-slate-400">{compra.clienteEmpresa || "Particular"}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {new Date(compra.fechaCompra).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-xs text-slate-600">
                      {compra.metodoPago}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {compra.detalles?.length || 0} producto(s)
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      {formatCurrency(compra.total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="relative inline-flex items-center">
                        <select
                          value={compra.estado}
                          disabled={actualizandoEstadoId === compra.id}
                          onChange={(e) => handleCambiarEstado(compra.id, e.target.value)}
                          title="Cambiar estado entre Completada o Pendiente"
                          className={`text-xs font-semibold pl-2.5 pr-6 py-1 rounded-full border cursor-pointer transition-all shadow-2xs appearance-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 capitalize ${
                            compra.estado === "completada"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80 focus:ring-emerald-400"
                              : compra.estado === "pendiente"
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80 focus:ring-amber-400"
                              : "bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-400"
                          }`}
                        >
                          <option value="completada" className="bg-white text-emerald-800 font-medium">
                            Completada
                          </option>
                          <option value="pendiente" className="bg-white text-amber-800 font-medium">
                            Pendiente
                          </option>
                        </select>
                        <div className="pointer-events-none absolute right-1.5 flex items-center">
                          {actualizandoEstadoId === compra.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                          ) : (
                            <ChevronDown className="w-3 h-3 opacity-60" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setCompraDetalleSeleccionada(compra)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Factura</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CARGAR FACTURA O NOTA EN FORMATO PDF            */}
      {/* ======================================================== */}
      {isPdfModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6"
          onClick={() => {
            if (!procesandoPdf && !guardandoPdfFactura) {
              setIsPdfModalOpen(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl animate-fade-in relative max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span>Procesar Factura o Nota de Entrega (PDF)</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3" />
                      Agente IA
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sube el archivo PDF para extraer número, ítems, precios y asociarla automáticamente al cliente
                  </p>
                </div>
              </div>
              <button
                disabled={procesandoPdf || guardandoPdfFactura}
                onClick={() => setIsPdfModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="mt-4 overflow-y-auto pr-1 flex-1 space-y-4">
              {/* ETAPA 1: SUBIDA DEL ARCHIVO PDF */}
              {!facturaPdfData && (
                <div className="space-y-4">
                  {/* Selector previo opcional de cliente */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pre-seleccionar Cliente (Opcional)</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        La IA detectará automáticamente el cliente de la factura si lo dejas en blanco
                      </span>
                    </label>
                    <select
                      value={preClienteId}
                      onChange={(e) => setPreClienteId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Detección Automática por IA desde el PDF --</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} {c.rif ? `[${c.rif}]` : ""} {c.empresa ? `(${c.empresa})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropzone PDF */}
                  <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/30 transition group">
                    <input
                      type="file"
                      accept=".pdf"
                      disabled={procesandoPdf}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessPdf(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />

                    {procesandoPdf ? (
                      <div className="py-6 flex flex-col items-center justify-center space-y-3">
                        <div className="relative">
                          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                          <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">
                            Analizando factura "{pdfFile?.name}" con IA...
                          </p>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            Extrayendo número de documento, ítems facturados, montos y asociando cliente en la base de datos...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto text-blue-600 group-hover:scale-105 transition-transform">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Haz clic o arrastra tu archivo PDF de Factura o Nota de Entrega
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Soporta facturas fiscales, notas de entrega, cotizaciones u órdenes de compra (.pdf)
                          </p>
                        </div>
                        <span className="inline-block px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-2xs">
                          Examinar archivo PDF
                        </span>
                      </div>
                    )}
                  </div>

                  {errorPdf && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">Error al procesar el archivo PDF</p>
                        <p className="mt-0.5">{errorPdf}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ETAPA 2: PREVISUALIZACIÓN Y CONFIRMACIÓN */}
              {facturaPdfData && (
                <div className="space-y-4">
                  {/* Banner de archivo procesado */}
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-900">
                          {facturaPdfData.archivo.nombre}
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span>{(facturaPdfData.archivo.tamano / 1024).toFixed(1)} KB</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                            <Sparkles className="w-2.5 h-2.5" />
                            Procesado con {facturaPdfData.motor === "gemini" ? "Gemini AI Multimodal" : "Motor Heurístico"}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFacturaPdfData(null);
                        setPdfFile(null);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
                    >
                      Cambiar Archivo PDF
                    </button>
                  </div>

                  {facturaPdfData.warning && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{facturaPdfData.warning}</span>
                    </div>
                  )}

                  {/* Tarjeta de Asociación o Creación Automática de Cliente */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800">
                          {modoCliente === "nuevo" ? "Registro Automático de Nuevo Cliente" : "Cliente Asociado en la Base de Datos *"}
                        </span>
                      </div>

                      {/* Selector de modo: Existente vs Nuevo */}
                      <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setModoCliente("existente")}
                          className={`px-2.5 py-1 font-semibold rounded-md transition ${
                            modoCliente === "existente"
                              ? "bg-white text-blue-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Cliente Existente
                        </button>
                        <button
                          type="button"
                          onClick={() => setModoCliente("nuevo")}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 font-semibold rounded-md transition ${
                            modoCliente === "nuevo"
                              ? "bg-white text-amber-700 shadow-2xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <UserPlus className="w-3 h-3 text-amber-600" />
                          <span>Nuevo Cliente</span>
                        </button>
                      </div>
                    </div>

                    {facturaPdfData.factura.clienteDetectado?.nombre && (
                      <div className="text-xs text-slate-500 bg-white p-2.5 rounded-lg border border-slate-100 flex items-center justify-between flex-wrap gap-2">
                        <span>
                          Detectado en PDF: <strong className="text-slate-800">{facturaPdfData.factura.clienteDetectado.nombre}</strong>
                          {facturaPdfData.factura.clienteDetectado.rif && ` (${facturaPdfData.factura.clienteDetectado.rif})`}
                        </span>
                        {facturaPdfData.factura.condicionPago && (
                          <span className="font-mono text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                            {facturaPdfData.factura.condicionPago}
                          </span>
                        )}
                      </div>
                    )}

                    {modoCliente === "nuevo" ? (
                      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-amber-800 font-medium">
                            Este cliente no existe en la base de datos. Se creará automáticamente al guardar la compra:
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Nombre / Razón Social *
                            </label>
                            <input
                              type="text"
                              required
                              value={editClienteNuevo.nombre}
                              onChange={(e) => setEditClienteNuevo({ ...editClienteNuevo, nombre: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              RIF / Cédula
                            </label>
                            <input
                              type="text"
                              value={editClienteNuevo.rif}
                              onChange={(e) => setEditClienteNuevo({ ...editClienteNuevo, rif: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Empresa / Comercial
                            </label>
                            <input
                              type="text"
                              value={editClienteNuevo.empresa}
                              onChange={(e) => setEditClienteNuevo({ ...editClienteNuevo, empresa: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Teléfono de Contacto
                            </label>
                            <input
                              type="text"
                              value={editClienteNuevo.telefono}
                              onChange={(e) => setEditClienteNuevo({ ...editClienteNuevo, telefono: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                              Dirección Fiscal / Despacho
                            </label>
                            <input
                              type="text"
                              value={editClienteNuevo.direccion}
                              onChange={(e) => setEditClienteNuevo({ ...editClienteNuevo, direccion: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {facturaPdfData.clienteSugerido && (
                          <div className="mb-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Coincidencia automática detectada: {facturaPdfData.clienteSugerido.nombre}
                          </div>
                        )}
                        <select
                          required
                          value={editClienteId}
                          onChange={(e) => setEditClienteId(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="">-- Selecciona el Cliente a Asociar --</option>
                          {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre} {c.rif ? `[${c.rif}]` : ""} {c.empresa ? `(${c.empresa})` : ""} - {c.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Encabezado de la Factura (Nro, Fecha, Pago, Estado) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        N° Factura / Nota *
                      </label>
                      <input
                        type="text"
                        required
                        value={editNumeroFactura}
                        onChange={(e) => setEditNumeroFactura(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>Fecha Emisión *</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={editFechaCompra}
                        onChange={(e) => setEditFechaCompra(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Método de Pago
                      </label>
                      <select
                        value={editMetodoPago}
                        onChange={(e) => {
                          setEditMetodoPago(e.target.value);
                          if (e.target.value === "credito") setEditEstado("pendiente");
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 capitalize"
                      >
                        <option value="transferencia">Transferencia</option>
                        <option value="credito">Crédito Comercial</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Estado de la Orden
                      </label>
                      <select
                        value={editEstado}
                        onChange={(e) => setEditEstado(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 capitalize"
                      >
                        <option value="completada">Completada / Pagada</option>
                        <option value="pendiente">Pendiente por Cobrar</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  </div>

                  {/* Notas u observaciones */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Observaciones / Pedido Cliente / Vendedor
                    </label>
                    <textarea
                      rows={2}
                      value={editNotas}
                      onChange={(e) => setEditNotas(e.target.value)}
                      placeholder="Condiciones, PCLI #, dirección de entrega..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Tabla de Ítems Extraídos */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">
                          Renglones e Ítems Extraídos ({editItems.length}):
                        </p>
                        <span className="text-[11px] text-slate-400">
                          {editItems.filter((i) => i.enCatalogo).length} en inventario, {editItems.filter((i) => !i.enCatalogo).length} nuevos
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddBlankPdfItem}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Añadir renglón</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-60 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3">Descripción Producto</th>
                            <th className="py-2 px-3 text-center w-20">Cant.</th>
                            <th className="py-2 px-3 text-right w-24">Precio Unit.</th>
                            <th className="py-2 px-3 text-right w-24">Subtotal</th>
                            <th className="py-2 px-3 w-32">Catálogo</th>
                            <th className="py-2 px-2 text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {editItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                <input
                                  type="text"
                                  value={item.codigoSku}
                                  onChange={(e) => handleUpdatePdfItem(idx, "codigoSku", e.target.value.toUpperCase())}
                                  className="w-24 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={item.nombre}
                                  onChange={(e) => handleUpdatePdfItem(idx, "nombre", e.target.value)}
                                  className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none text-slate-800"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.cantidad}
                                  onChange={(e) => handleUpdatePdfItem(idx, "cantidad", parseInt(e.target.value) || 1)}
                                  className="w-14 text-center bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-mono">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.precioUnitario}
                                  onChange={(e) => handleUpdatePdfItem(idx, "precioUnitario", parseFloat(e.target.value) || 0)}
                                  className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                                {formatCurrency(item.subtotal)}
                              </td>
                              <td className="py-2 px-3">
                                {item.enCatalogo ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    <Check className="w-2.5 h-2.5" />
                                    Stock: {item.stockActual}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    Nuevo SKU
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePdfItem(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Resumen de totales y verificación */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                    <div className="text-xs space-y-0.5">
                      <p className="text-slate-500 font-medium flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Total declarado en documento: <strong>{formatCurrency(facturaPdfData.factura.total)}</strong></span>
                      </p>
                      <p className="text-slate-600 font-semibold">
                        Suma calculada de {editItems.length} renglones: <strong className="text-emerald-700">{formatCurrency(calcularTotalPdf())}</strong>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block font-medium">Total Final a Facturar:</span>
                      <span className="text-2xl font-black text-slate-900">
                        {formatCurrency(calcularTotalPdf())}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pie fijo de acciones */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                disabled={guardandoPdfFactura}
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
              >
                Cancelar
              </button>

              {facturaPdfData && (
                <button
                  type="button"
                  disabled={
                    guardandoPdfFactura ||
                    editItems.length === 0 ||
                    (modoCliente === "existente" && !editClienteId) ||
                    (modoCliente === "nuevo" && !editClienteNuevo.nombre.trim())
                  }
                  title={
                    editItems.length === 0
                      ? "La factura debe tener al menos un producto"
                      : modoCliente === "existente" && !editClienteId
                      ? "Por favor selecciona un cliente de la lista"
                      : modoCliente === "nuevo" && !editClienteNuevo.nombre.trim()
                      ? "Por favor indica el nombre del nuevo cliente"
                      : "Insertar factura en la base de datos"
                  }
                  onClick={handleConfirmarPdfCompra}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {guardandoPdfFactura ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Insertando en Base de Datos...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Insertar Factura en Base de Datos</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REGISTRAR NUEVA COMPRA MANUAL                   */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-fade-in relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registrar Nueva Compra / Venta</h2>
                <p className="text-xs text-slate-500">Vincula un cliente con productos de su catálogo</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarCompra} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Seleccionar Cliente y Fecha de Compra */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cliente de la Cartera *
                  </label>
                  <select
                    required
                    value={clienteId}
                    onChange={(e) => setClienteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  >
                    <option value="">-- Seleccionar Cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.rif ? `[${c.rif}]` : ""} {c.empresa ? `(${c.empresa})` : ""} - {c.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Fecha de Compra *</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={fechaCompra}
                    onChange={(e) => setFechaCompra(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Agregar Productos */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Añadir Productos del Portafolio:
                </label>
                <div className="flex gap-2">
                  <select
                    id="selector-producto"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    defaultValue=""
                  >
                    <option value="" disabled>Selecciona un producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.stockActual <= 0}>
                        {p.nombre} ({formatCurrency(p.precio)}) - Stock: {p.stockActual}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const sel = document.getElementById("selector-producto") as HTMLSelectElement;
                      if (sel && sel.value) {
                        handleAddItem(sel.value);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-xl transition"
                  >
                    Añadir
                  </button>
                </div>

                {/* Lista de productos agregados */}
                {items.length > 0 ? (
                  <div className="divide-y divide-slate-200 mt-2 border border-slate-200 rounded-xl bg-white overflow-hidden">
                    {items.map((it) => {
                      const prod = productos.find((p) => p.id === it.productoId);
                      return (
                        <div key={it.productoId} className="p-3 flex items-center justify-between text-xs">
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{prod?.nombre}</p>
                            <p className="text-slate-400 font-mono text-[11px]">{prod?.codigoSku} · {formatCurrency(it.precioUnitario)} c/u</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <label className="text-slate-500 font-medium">Cant:</label>
                              <input
                                type="number"
                                min="1"
                                max={prod?.stockActual || 999}
                                value={it.cantidad}
                                onChange={(e) => handleUpdateItemCantidad(it.productoId, parseInt(e.target.value) || 1)}
                                className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-center font-bold"
                              />
                            </div>
                            <span className="font-bold text-slate-900 w-20 text-right">
                              {formatCurrency(it.cantidad * it.precioUnitario)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(it.productoId)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    Aún no has agregado productos a esta compra.
                  </p>
                )}
              </div>

              {/* Método de pago y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  >
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="tarjeta">Tarjeta de Débito/Crédito</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="credito">Crédito Comercial (Plazo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado de la Orden
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  >
                    <option value="completada">Completada / Pagada</option>
                    <option value="pendiente">Pendiente por Cobrar</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas de Entrega / Facturación
                </label>
                <textarea
                  rows={2}
                  placeholder="Información adicional, número de guía o condiciones..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              {/* Total y botones */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-xs text-slate-400 block">Total a Facturar:</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {formatCurrency(calcularTotal())}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando || items.length === 0}
                    className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {guardando ? "Procesando..." : "Confirmar Venta"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: VER FACTURA / DETALLE COMPROBANTE               */}
      {/* ======================================================== */}
      {compraDetalleSeleccionada && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setCompraDetalleSeleccionada(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-fade-in relative max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Encabezado fijo */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Comprobante Nro. {compraDetalleSeleccionada.numeroFactura}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {new Date(compraDetalleSeleccionada.fechaCompra).toLocaleString("es-ES")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompraDetalleSeleccionada(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="mt-4 space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800 text-sm">{compraDetalleSeleccionada.clienteNombre}</p>
                {compraDetalleSeleccionada.clienteEmpresa && (
                  <p className="text-slate-500 font-medium">{compraDetalleSeleccionada.clienteEmpresa}</p>
                )}
                <div className="mt-2.5 flex items-center justify-between gap-4 text-slate-500 text-[11px] flex-wrap border-t border-slate-200/60 pt-2.5">
                  <div>
                    <span>Método de Pago: </span>
                    <strong className="capitalize text-slate-700 font-semibold">{compraDetalleSeleccionada.metodoPago}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-600">Estado:</span>
                    <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg shadow-inner">
                      <button
                        type="button"
                        disabled={actualizandoEstadoId === compraDetalleSeleccionada.id}
                        onClick={() => handleCambiarEstado(compraDetalleSeleccionada.id, "completada")}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition ${
                          compraDetalleSeleccionada.estado === "completada"
                            ? "bg-white text-emerald-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Completada</span>
                      </button>
                      <button
                        type="button"
                        disabled={actualizandoEstadoId === compraDetalleSeleccionada.id}
                        onClick={() => handleCambiarEstado(compraDetalleSeleccionada.id, "pendiente")}
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition ${
                          compraDetalleSeleccionada.estado === "pendiente"
                            ? "bg-white text-amber-700 shadow-xs"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Pendiente</span>
                      </button>
                    </div>
                    {actualizandoEstadoId === compraDetalleSeleccionada.id && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-700">Desglose de Ítems:</p>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {compraDetalleSeleccionada.detalles?.length || 0} renglones
                  </span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/30">
                  {compraDetalleSeleccionada.detalles?.map((d) => (
                    <div key={d.id} className="p-3 flex items-start sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 leading-snug">{d.nombreProducto}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {d.codigoSku && <span className="font-semibold text-slate-500 mr-2">{d.codigoSku}</span>}
                          {d.cantidad} unid. × {formatCurrency(d.precioUnitario)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0 text-sm">{formatCurrency(d.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {compraDetalleSeleccionada.notas && (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-xs border border-slate-100">
                  <p className="font-semibold text-slate-700 mb-1">Notas / Observaciones:</p>
                  <p className="italic leading-relaxed">{compraDetalleSeleccionada.notas}</p>
                </div>
              )}
            </div>

            {/* Pie fijo con total y botón de cierre */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Monto Total Facturado:</span>
                <span className="text-xl font-black text-slate-900">
                  {formatCurrency(compraDetalleSeleccionada.total)}
                </span>
              </div>
              <button
                onClick={() => setCompraDetalleSeleccionada(null)}
                className="px-5 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-xs transition"
              >
                Cerrar Comprobante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
