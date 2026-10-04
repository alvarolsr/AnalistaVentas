"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart, 
  Database,
  TrendingUp,
  Bot,
  X
} from "lucide-react";

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    {
      href: "/",
      label: "Dashboard Analista",
      icon: BarChart3,
      description: "KPIs y métricas de venta",
    },
    {
      href: "/agente",
      label: "Agente Analista AI",
      icon: Bot,
      description: "Chat y consultoría comercial",
      badge: "Gemini",
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
    <aside 
      className={`bg-slate-900 text-white flex flex-col shrink-0 ${
        isMobile 
          ? "w-full h-full" 
          : "w-64 min-h-screen border-r border-slate-800 shadow-xl"
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/25">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg leading-tight tracking-tight">Analista de Ventas</h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">Neon + Vercel</p>
          </div>
        </div>

        {/* Botón Cerrar en Móvil */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Gestión & Análisis
        </p>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => {
                if (isMobile && onClose) {
                  onClose();
                }
              }}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate">{link.label}</span>
                  {link.badge && (
                    <span className="text-[9px] bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                      {link.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] font-normal truncate ${isActive ? "text-blue-100" : "text-slate-500"}`}>
                  {link.description}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Database connection badge info */}
      <div className="p-3 sm:p-4 border-t border-slate-800/80 shrink-0">
        <div className="p-2.5 sm:p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200">Neon Postgres</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 leading-relaxed">
            Arquitectura serverless optimizada para Vercel Edge y dispositivos móviles.
          </p>
        </div>
      </div>
    </aside>
  );
}
