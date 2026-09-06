import { NextResponse } from "next/server";
import { DataService } from "@/db/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await DataService.getDashboardStats();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error en API dashboard:", error);
    return NextResponse.json({ error: error.message || "Error al obtener métricas" }, { status: 500 });
  }
}
