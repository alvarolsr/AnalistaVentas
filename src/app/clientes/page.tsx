"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Plus, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Trash2, 
  X,
  CheckCircle2,
  ShoppingCart,
  Receipt,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  Package,
  Clock,
  ExternalLink,
  CreditCard
} from "lucide-react";
import { type Cliente } from "@/db/schema";
import { type CompraCompleta } from "@/db/service";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [compras, setCompras] = useState<CompraCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  // Historial Modal State
  const [clienteHistorial, setClienteHistorial] = useState<Cliente | null>(null);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [comprasExpandidas, setComprasExpandidas] = useState<Record<string, boolean>>({});

  // Form State
  const [form, setForm] = useState({
    nombre: "",
    rif: "",
    email: "",
    telefono: "",
    empresa: "",
    direccion: "",
    notas: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClientes, resCompras] = await Promise.all([
        fetch("/api/clientes"),
        fetch("/api/compras"),
      ]);
      const [jsonClientes, jsonCompras] = await Promise.all([
        resClientes.json(),
        resCompras.json(),
      ]);
      setClientes(Array.isArray(jsonClientes) ? jsonClientes : []);
      setCompras(Array.isArray(jsonCompras) ? jsonCompras : []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setClienteHistorial(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          nombre: "",
          rif: "",
          email: "",
          telefono: "",
          empresa: "",
          direccion: "",
          notas: "",
        });
        setAlerta("Cliente registrado exitosamente");
        setTimeout(() => setAlerta(null), 4000);
        fetchData();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al registrar cliente");
      }
    } catch (err) {
      console.error(err);
      alert("Error en la solicitud");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCliente = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre} de la cartera?`)) return;

    try {
      const res = await fetch(`/api/clientes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setClientes((prev) => prev.filter((c) => c.id !== id));
        setAlerta("Cliente eliminado");
        setTimeout(() => setAlerta(null), 3000);
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (c.rif && c.rif.toLowerCase().includes(filtro.toLowerCase())) ||
      c.email.toLowerCase().includes(filtro.toLowerCase()) ||
      (c.empresa && c.empresa.toLowerCase().includes(filtro.toLowerCase()))
  );

  // Datos para el historial del cliente seleccionado
  const comprasDelClienteSeleccionado = clienteHistorial
    ? compras.filter((c) => c.clienteId === clienteHistorial.id)
    : [];

  const comprasFiltradasHistorial = comprasDelClienteSeleccionado.filter((c) => {
    if (!busquedaHistorial.trim()) return true;
    const term = busquedaHistorial.toLowerCase();
    const coincideFactura = c.numeroFactura?.toLowerCase().includes(term);
    const coincideMetodo = c.metodoPago?.toLowerCase().includes(term);
    const coincideEstado = c.estado?.toLowerCase().includes(term);
    const coincideProducto = c.detalles?.some(
      (d) =>
        d.nombreProducto?.toLowerCase().includes(term) ||
        d.codigoSku?.toLowerCase().includes(term)
    );
    return coincideFactura || coincideMetodo || coincideEstado || coincideProducto;
  });

  const totalInvertido = comprasDelClienteSeleccionado
    .filter((c) => c.estado === "completada")
    .reduce((acc, c) => acc + Number(c.total || 0), 0);

  const ordenesCompletadas = comprasDelClienteSeleccionado.filter(
    (c) => c.estado === "completada"
  ).length;

  const ordenesPendientes = comprasDelClienteSeleccionado.filter(
    (c) => c.estado === "pendiente"
  ).length;

  const ticketPromedio =
    ordenesCompletadas > 0 ? totalInvertido / ordenesCompletadas : 0;

  const ultimaCompra =
    comprasDelClienteSeleccionado.length > 0
      ? new Date(
          Math.max(
            ...comprasDelClienteSeleccionado.map((c) =>
              new Date(c.fechaCompra).getTime()
            )
          )
        )
      : null;

  const toggleCompraExpandida = (id: string) => {
    setComprasExpandidas((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExpandirTodas = () => {
    const expandidas: Record<string, boolean> = {};
    comprasFiltradasHistorial.forEach((c) => {
      expandidas[c.id] = true;
    });
    setComprasExpandidas(expandidas);
  };

  const handleMinimizarTodas = () => {
    setComprasExpandidas({});
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Cartera de Clientes</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión y seguimiento comercial de cuentas, empresas e historial de compras.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {alerta && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{alerta}</span>
        </div>
      )}

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nombre, RIF, correo o empresa..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
        />
      </div>

      {/* Listado de Clientes */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Cargando cartera de clientes...</div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No se encontraron clientes</p>
          <p className="text-xs text-slate-400 mt-1">Registra nuevos clientes para comenzar a gestionar ventas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clientesFiltrados.map((cliente) => {
            const comprasCliente = compras.filter((c) => c.clienteId === cliente.id);
            const totalGastadoCliente = comprasCliente
              .filter((c) => c.estado === "completada")
              .reduce((sum, c) => sum + Number(c.total || 0), 0);

            return (
              <div
                key={cliente.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm">
                        {cliente.nombre
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{cliente.nombre}</h3>
                          {cliente.rif && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded border border-blue-200">
                              {cliente.rif}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{cliente.empresa || "Cliente Particular"}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleEliminarCliente(cliente.id, cliente.nombre)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cliente.email}</span>
                    </div>
                    {cliente.telefono && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cliente.telefono}</span>
                      </div>
                    )}
                    {cliente.direccion && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cliente.direccion}</span>
                      </div>
                    )}
                  </div>

                  {cliente.notas && (
                    <p className="mt-3 p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500 italic border border-slate-100">
                      "{cliente.notas}"
                    </p>
                  )}

                  {/* Resumen rápido de compras del cliente */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        comprasCliente.length > 0
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      {comprasCliente.length}{" "}
                      {comprasCliente.length === 1 ? "compra" : "compras"}
                    </span>
                    {totalGastadoCliente > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 font-mono">
                        ${totalGastadoCliente.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Registrado el {new Date(cliente.creadoEn).toLocaleDateString("es-ES")}
                  </span>
                  <button
                    onClick={() => {
                      setBusquedaHistorial("");
                      setComprasExpandidas({});
                      setClienteHistorial(cliente);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline transition"
                  >
                    <span>Ver historial</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Historial de Cliente */}
      {clienteHistorial && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
            {/* Header del Modal */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-sm shrink-0">
                  {clienteHistorial.nombre
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">
                      {clienteHistorial.nombre}
                    </h2>
                    {clienteHistorial.rif && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono text-xs font-bold rounded-md">
                        {clienteHistorial.rif}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{clienteHistorial.empresa || "Cliente Particular"}</span>
                    <span>•</span>
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{clienteHistorial.email}</span>
                    {clienteHistorial.telefono && (
                      <>
                        <span>•</span>
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{clienteHistorial.telefono}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/compras`}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 rounded-xl text-xs font-semibold shadow-sm transition"
                  title="Abrir módulo de compras"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Módulo Compras</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </Link>
                <button
                  onClick={() => setClienteHistorial(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Métricas / KPIs del Cliente */}
            <div className="p-4 sm:p-6 bg-white border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 shrink-0">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Inversión Total</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  ${totalInvertido.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Facturado exitoso</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Total Órdenes</span>
                  <Receipt className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-lg font-bold text-slate-900">
                  {comprasDelClienteSeleccionado.length}
                </div>
                <span className="text-[10px] text-slate-500">
                  {ordenesCompletadas} completadas {ordenesPendientes > 0 ? `· ${ordenesPendientes} pend.` : ""}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Ticket Promedio</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  ${ticketPromedio.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <span className="text-[10px] text-slate-500">Por orden de compra</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span>Última Compra</span>
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {ultimaCompra ? ultimaCompra.toLocaleDateString("es-ES") : "Sin compras"}
                </div>
                <span className="text-[10px] text-slate-500">
                  {ultimaCompra ? "Fecha de última orden" : "Cliente nuevo"}
                </span>
              </div>
            </div>

            {/* Contenido con Scroll: Lista de Facturas y Productos */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span>Historial de Facturas y Compras ({comprasFiltradasHistorial.length})</span>
                  </h3>

                  {comprasFiltradasHistorial.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={handleExpandirTodas}
                        className="px-2 py-0.5 rounded-md hover:bg-slate-100 text-[11px] text-blue-600 font-medium hover:underline transition"
                      >
                        Expandir todas
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={handleMinimizarTodas}
                        className="px-2 py-0.5 rounded-md hover:bg-slate-100 text-[11px] text-slate-600 font-medium hover:underline transition"
                      >
                        Minimizar todas
                      </button>
                    </div>
                  )}
                </div>

                {comprasDelClienteSeleccionado.length > 0 && (
                  <div className="relative max-w-xs w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrar factura, producto, SKU..."
                      value={busquedaHistorial}
                      onChange={(e) => setBusquedaHistorial(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                )}
              </div>

              {comprasDelClienteSeleccionado.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-10 text-center">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-slate-800">
                    Sin órdenes de compra registradas
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Este cliente aún no ha registrado transacciones en el sistema de ventas.
                  </p>
                  <Link
                    href="/compras"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Primera Compra</span>
                  </Link>
                </div>
              ) : comprasFiltradasHistorial.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  No se encontraron compras que coincidan con "{busquedaHistorial}"
                </div>
              ) : (
                <div className="space-y-3">
                  {comprasFiltradasHistorial.map((compra) => {
                    const esCompletada = compra.estado === "completada";
                    const esPendiente = compra.estado === "pendiente";
                    const isExpanded = Boolean(comprasExpandidas[compra.id]);

                    return (
                      <div
                        key={compra.id}
                        className={`bg-white rounded-xl border transition shadow-xs overflow-hidden ${
                          isExpanded ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Renglón minimizado (Factura, Fecha, Estado, Crédito/Método y Monto Total) */}
                        <div
                          onClick={() => toggleCompraExpandida(compra.id)}
                          className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 cursor-pointer hover:bg-slate-50/80 transition select-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1 text-slate-400 rounded-md">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                              {compra.numeroFactura}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(compra.fechaCompra).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                                esCompletada
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : esPendiente
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {compra.estado}
                            </span>

                            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md capitalize flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-slate-400" />
                              {compra.metodoPago}
                            </span>

                            <span className="text-sm sm:text-base font-bold text-slate-900 font-mono pl-1 sm:pl-2">
                              ${Number(compra.total).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Desglose desplegable de Productos de la Compra */}
                        {isExpanded && (
                          <div className="p-4 pt-1 border-t border-slate-100 space-y-3 bg-slate-50/40 animate-fade-in">
                            <div className="space-y-1.5 pt-2">
                              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                Productos en la orden ({compra.detalles?.length || 0})
                              </p>
                              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                                {compra.detalles?.map((det) => (
                                  <div
                                    key={det.id}
                                    className="p-2.5 flex items-center justify-between text-xs gap-3 hover:bg-slate-50 transition"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                                        {det.codigoSku}
                                      </span>
                                      <span className="font-medium text-slate-800 truncate">
                                        {det.nombreProducto}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0 text-slate-600">
                                      <span className="text-slate-500 text-[11px]">
                                        {det.cantidad} unid. × ${Number(det.precioUnitario).toFixed(2)}
                                      </span>
                                      <span className="font-bold text-slate-900 font-mono">
                                        ${Number(det.subtotal).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {compra.notas && (
                              <p className="text-[11px] text-slate-500 italic bg-amber-50/60 border border-amber-100 rounded-lg p-2.5">
                                Nota: {compra.notas}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Presiona <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-600">ESC</kbd> para cerrar
              </span>
              <button
                type="button"
                onClick={() => setClienteHistorial(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl shadow-sm transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Registrar Nuevo Cliente</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearCliente} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Carlos Mendoza"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RIF / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: J-12345678-9 o V-12345678-0"
                    value={form.rif}
                    onChange={(e) => setForm({ ...form, rif: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm uppercase font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="correo@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="+58 412 000-0000"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Empresa o Razón Social
                </label>
                <input
                  type="text"
                  placeholder="Ej: TechCorp Solutions"
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección Comercial / Fiscal
                </label>
                <input
                  type="text"
                  placeholder="Av. Principal, Edificio / Oficina..."
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas de Negociación / Perfil del Cliente
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles clave sobre preferencias de pago, frecuencia de compra..."
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
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
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Registrar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
