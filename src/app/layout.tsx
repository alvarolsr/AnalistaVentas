import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppLayout } from "@/components/AppLayout";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "Analista de Ventas - Neon & Vercel",
  description: "Plataforma analítica para cartera de clientes, catálogo de productos y registro de compras.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AnalistaVentas",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
