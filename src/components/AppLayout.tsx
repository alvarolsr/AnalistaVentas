"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Barra lateral fija para escritorio y tablet horizontal (≥ 768px) */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Menú lateral deslizable (Drawer) para teléfonos y tablets (< 768px) */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Fondo oscuro traslúcido para cerrar al tocar fuera */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Panel lateral */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 shadow-2xl z-10 animate-fade-in">
            <Sidebar onClose={() => setSidebarOpen(false)} isMobile />
          </div>
        </div>
      )}

      {/* Contenedor Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        
        {/* Contenido scrolleable con padding inferior para no solapar la barra móvil */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-20 md:pb-8">
          {children}
        </main>

        {/* Barra de navegación inferior rápida para teléfonos */}
        <BottomNav />
      </div>
    </div>
  );
}
