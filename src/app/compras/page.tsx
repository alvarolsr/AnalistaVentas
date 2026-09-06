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
  Receipt
} from "lucide-react";
import { type Cliente, type Producto } from "@/db/schema";
import { type CompraCompleta } from "@/db/service";

export default function ComprasPage() {
  const [compras, setCompras] = useState<CompraCompleta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [compraDetalleSeleccionada, setCompraDetalleSeleccionada] = useState<CompraCompleta | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  // Form State para registrar nueva compra
  const [clienteId, setClienteId] = useState("");
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
        fetch("/api/compras"),
        fetch("/api/clientes"),
        fetch("/api/productos"),
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
  }, []);

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
          metodoPago,
          estado,
          notas,
          items,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setClienteId("");
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
            Control de órdenes de compra realizadas por clientes, emisión de comprobantes y métodos de pago.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nueva Compra</span>
        </button>
      </div>

      {alerta && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
          <p className="text-xs text-slate-400 mt-1">Registra la primera venta para ver las métricas en acción.</p>
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
                      {compra.numeroFactura}
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
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          compra.estado === "completada"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : compra.estado === "pendiente"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {compra.estado === "completada" && <CheckCircle2 className="w-3 h-3" />}
                        {compra.estado === "pendiente" && <Clock className="w-3 h-3" />}
                        {compra.estado}
                      </span>
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

      {/* Modal Registrar Nueva Compra */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl animate-fade-in relative max-h-[90vh] flex flex-col">
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
              {/* Seleccionar Cliente */}
              <div>
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
                      {c.nombre} {c.empresa ? `(${c.empresa})` : ""} - {c.email}
                    </option>
                  ))}
                </select>
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

      {/* Modal Ver Factura / Detalle */}
      {compraDetalleSeleccionada && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Comprobante {compraDetalleSeleccionada.numeroFactura}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {new Date(compraDetalleSeleccionada.fechaCompra).toLocaleString("es-ES")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCompraDetalleSeleccionada(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800 text-sm">{compraDetalleSeleccionada.clienteNombre}</p>
                {compraDetalleSeleccionada.clienteEmpresa && (
                  <p className="text-slate-500">{compraDetalleSeleccionada.clienteEmpresa}</p>
                )}
                <div className="mt-2 flex gap-4 text-slate-500 text-[11px]">
                  <span>Método: <strong className="capitalize text-slate-700">{compraDetalleSeleccionada.metodoPago}</strong></span>
                  <span>Estado: <strong className="capitalize text-slate-700">{compraDetalleSeleccionada.estado}</strong></span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-700 mb-2">Desglose de Ítems:</p>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {compraDetalleSeleccionada.detalles?.map((d) => (
                    <div key={d.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{d.nombreProducto}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {d.cantidad} unid. × {formatCurrency(d.precioUnitario)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(d.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {compraDetalleSeleccionada.notas && (
                <div className="p-2.5 bg-slate-50 rounded-lg text-slate-500 italic">
                  "{compraDetalleSeleccionada.notas}"
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-700">Monto Total:</span>
                <span className="text-xl font-black text-slate-900">
                  {formatCurrency(compraDetalleSeleccionada.total)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setCompraDetalleSeleccionada(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
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
