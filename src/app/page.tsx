"use client";

import { useEffect, useState } from "react";
import { 
  DollarSign, 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  ArrowUpRight,
  Plus
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  kpis: {
    totalVentas: number;
    ticketPromedio: number;
    totalClientes: number;
    totalProductos: number;
    totalCompras: number;
  };
  topClientes: Array<{
    id: string;
    nombre: string;
    empresa: string;
    total: number;
    ordenes: number;
  }>;
  topProductos: Array<{
    id: string;
    nombre: string;
    sku: string;
    cantidad: number;
    totalRecaudado: number;
  }>;
  stockBajo: Array<{
    id: string;
    nombre: string;
    codigoSku: string;
    stockActual: number;
  }>;
  comprasRecientes: Array<{
    id: string;
    numeroFactura: string;
    clienteNombre: string;
    clienteEmpresa: string | null;
    fechaCompra: string;
    total: string;
    estado: string;
    metodoPago: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error al cargar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Analizando datos de ventas...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalVentas: 0,
    ticketPromedio: 0,
    totalClientes: 0,
    totalProductos: 0,
    totalCompras: 0,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Title and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Analítica Comercial</h1>
          <p className="text-sm text-slate-500 mt-1">
            Resumen global de ventas, cartera de clientes y rendimiento del portafolio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/compras"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Compra / Venta</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Ventas Totales */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ventas Acumuladas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.totalVentas)}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{kpis.totalCompras} compras procesadas</span>
            </p>
          </div>
        </div>

        {/* Card 2: Ticket Promedio */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket Promedio</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(kpis.ticketPromedio)}</h3>
            <p className="text-xs text-slate-500 mt-1">Por orden completada</p>
          </div>
        </div>

        {/* Card 3: Cartera de Clientes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cartera de Clientes</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{kpis.totalClientes}</h3>
            <p className="text-xs text-indigo-600 font-medium mt-1">
              <Link href="/clientes" className="hover:underline">Ver cartera completa &rarr;</Link>
            </p>
          </div>
        </div>

        {/* Card 4: Portafolio de Productos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Portafolio Productos</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900">{kpis.totalProductos}</h3>
            <p className="text-xs text-purple-600 font-medium mt-1">
              <Link href="/productos" className="hover:underline">Explorar catálogo &rarr;</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de Stock Bajo si existe */}
      {data?.stockBajo && data.stockBajo.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900">Alerta de Inventario: Stock Bajo</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              Los siguientes productos están cerca de agotarse (10 o menos unidades disponibles):
            </p>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {data.stockBajo.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 bg-amber-100/80 text-amber-900 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-300"
                >
                  <span>{p.nombre}</span>
                  <span className="bg-amber-600 text-white px-1.5 py-0.2 rounded text-[10px]">
                    {p.stockActual} en stock
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid: Top Clientes y Top Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Clientes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Top Clientes por Facturación</h3>
              <p className="text-xs text-slate-500">Cartera de mayor impacto en ingresos</p>
            </div>
            <Link
              href="/clientes"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Ver todos
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.topClientes && data.topClientes.length > 0 ? (
              data.topClientes.map((cliente, idx) => (
                <div key={cliente.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{cliente.nombre}</p>
                      <p className="text-xs text-slate-500">{cliente.empresa || "Particular"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(cliente.total)}</p>
                    <p className="text-[11px] text-slate-400">{cliente.ordenes} compras</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No hay datos de clientes aún.</p>
            )}
          </div>
        </div>

        {/* Top Productos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Productos Más Vendidos</h3>
              <p className="text-xs text-slate-500">Unidades colocadas en el mercado</p>
            </div>
            <Link
              href="/productos"
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              Ver catálogo
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data?.topProductos && data.topProductos.length > 0 ? (
              data.topProductos.map((prod, idx) => (
                <div key={prod.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{prod.nombre}</p>
                      <p className="text-xs text-slate-500">SKU: {prod.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{prod.cantidad} unid.</p>
                    <p className="text-[11px] text-slate-400">{formatCurrency(prod.totalRecaudado)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No hay productos vendidos aún.</p>
            )}
          </div>
        </div>
      </div>

      {/* Compras Recientes */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-base text-slate-900">Registro de Transacciones Recientes</h3>
            <p className="text-xs text-slate-500">Últimas compras efectuadas por la cartera de clientes</p>
          </div>
          <Link
            href="/compras"
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
          >
            <span>Ver historial completo</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Factura / Nota</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Método de Pago</th>
                <th className="py-3 px-3">Total</th>
                <th className="py-3 px-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data?.comprasRecientes && data.comprasRecientes.length > 0 ? (
                data.comprasRecientes.map((compra) => (
                  <tr key={compra.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-3 font-semibold text-slate-900">
                      {compra.numeroFactura}
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-medium text-slate-800">{compra.clienteNombre}</p>
                      {compra.clienteEmpresa && (
                        <p className="text-xs text-slate-400">{compra.clienteEmpresa}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 text-xs">
                      {new Date(compra.fechaCompra).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 capitalize text-xs">
                      {compra.metodoPago}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {formatCurrency(Number(compra.total))}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          compra.estado === "completada"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : compra.estado === "pendiente"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {compra.estado}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No hay transacciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
