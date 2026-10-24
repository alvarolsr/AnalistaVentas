"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart, 
  Bot 
} from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart3 },
    { href: "/agente", label: "Agente AI", icon: Bot, isAi: true },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/productos", label: "Productos", icon: Package },
    { href: "/compras", label: "Ventas", icon: ShoppingCart },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all relative min-w-0 flex-1 max-w-[72px] ${
              isActive
                ? item.isAi
                  ? "text-purple-600 font-bold"
                  : "text-blue-600 font-bold"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <div className={`p-0.5 rounded-lg transition-transform ${isActive ? "scale-105" : ""}`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-[9.5px] xs:text-[10px] tracking-tight leading-tight truncate max-w-full text-center">
              {item.label}
            </span>
            {isActive && (
              <span 
                className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full mt-0.5 ${
                  item.isAi ? "bg-purple-600" : "bg-blue-600"
                }`} 
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
