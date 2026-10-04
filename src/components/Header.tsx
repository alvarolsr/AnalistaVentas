"use client";

import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle, RefreshCw, Menu } from "lucide-react";

interface HeaderProps {
  onOpenSidebar?: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const [isNeon, setIsNeon] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      setIsNeon(Boolean(data.isNeonConnected));
    } catch {
      setIsNeon(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSyncNeon = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      setSyncMsg(data.message || (data.success ? "Esquema sincronizado" : "Error"));
      setTimeout(() => setSyncMsg(null), 5000);
      checkStatus();
    } catch {
      setSyncMsg("Error al sincronizar con Neon");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3.5 sm:px-6 md:px-8 flex items-center justify-between shadow-xs shrink-0">
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        {/* Botón Menú Hamburguesa para Móvil */}
        <button
          onClick={onOpenSidebar}
          aria-label="Abrir menú"
          className="md:hidden p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="truncate">
          <h2 className="text-sm font-semibold text-slate-800 truncate">Panel Comercial</h2>
          <p className="text-xs text-slate-500 hidden sm:block truncate">
            Métricas, clientes, productos y transacciones en tiempo real
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {syncMsg && (
          <span className="text-[11px] sm:text-xs bg-slate-100 text-slate-700 px-2.5 sm:px-3 py-1 rounded-full border border-slate-300 animate-fade-in truncate max-w-[130px] sm:max-w-none">
            {syncMsg}
          </span>
        )}

        {/* Badge Estado Neon */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border transition-colors bg-slate-50">
          <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {isNeon ? (
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">Neon Conectado</span>
              <span className="sm:hidden text-[11px] font-semibold">Neon</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline">Modo Demo</span>
              <span className="sm:hidden text-[11px] font-semibold">Demo</span>
            </span>
          )}
        </div>

        {/* Botón Sincronizar */}
        <button
          onClick={handleSyncNeon}
          disabled={syncing}
          title="Sincronizar estructura de tablas con Neon"
          className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg transition shadow-sm disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Sincronizar Tablas</span>
          <span className="sm:hidden">Sync</span>
        </button>
      </div>
    </header>
  );
}
