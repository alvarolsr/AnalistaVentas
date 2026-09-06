"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart, 
  Database,
  TrendingUp
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    {
      href: "/",
      label: "Dashboard Analista",
      icon: BarChart3,
      description: "KPIs y métricas de venta",
    },
    {
      href: "/clientes",
      label: "Cartera de Clientes",
      icon: Users,
      description: "Directorio e historial",
    },
    {
      href: "/productos",
      label: "Portafolio de Productos",
      icon: Package,
      description: "Catálogo e inventario",
    },
    {
      href: "/compras",
      label: "Registro de Ventas",
      icon: ShoppingCart,
      description: "Órdenes y facturación",
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col border-r border-slate-800 shadow-xl shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Analista de Ventas</h1>
            <p className="text-xs text-slate-400 font-medium">Neon + Vercel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5">
        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Gestión & Análisis
        </p>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
              <div className="flex flex-col">
                <span>{link.label}</span>
                <span className={`text-[11px] font-normal ${isActive ? "text-blue-100" : "text-slate-500"}`}>
                  {link.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Database connection badge info */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">Neon Postgres</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Arquitectura serverless optimizada para Vercel Edge y Serverless Functions.
          </p>
        </div>
      </div>
    </aside>
  );
}
