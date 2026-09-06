"use client";

import { useEffect, useState } from "react";
import { Database, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export function Header() {
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
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Panel de Control Comercial</h2>
          <p className="text-xs text-slate-500">Métricas, clientes, productos y transacciones en tiempo real</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {syncMsg && (
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-300 animate-fade-in">
            {syncMsg}
          </span>
        )}

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors bg-slate-50">
          <Database className="w-3.5 h-3.5 text-slate-500" />
          {isNeon ? (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Neon PostgreSQL Conectado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              Modo Demo (Configurar DATABASE_URL)
            </span>
          )}
        </div>

        <button
          onClick={handleSyncNeon}
          disabled={syncing}
          title="Sincronizar estructura de tablas con Neon"
          className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-3.5 py-2 rounded-lg transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>Sincronizar Tablas</span>
        </button>
      </div>
    </header>
  );
}
