"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Trash2, 
  X,
  CheckCircle2
} from "lucide-react";
import { type Cliente } from "@/db/schema";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    nombre: "",
    rif: "",
    email: "",
    telefono: "",
    empresa: "",
    direccion: "",
    notas: "",
  });

  const fetchClientes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clientes");
      const json = await res.json();
      setClientes(json);
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setForm({
          nombre: "",
          rif: "",
          email: "",
          telefono: "",
          empresa: "",
          direccion: "",
          notas: "",
        });
        setAlerta("Cliente registrado exitosamente");
        setTimeout(() => setAlerta(null), 4000);
        fetchClientes();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al registrar cliente");
      }
    } catch (err) {
      console.error(err);
      alert("Error en la solicitud");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCliente = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${nombre} de la cartera?`)) return;

    try {
      const res = await fetch(`/api/clientes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setClientes((prev) => prev.filter((c) => c.id !== id));
        setAlerta("Cliente eliminado");
        setTimeout(() => setAlerta(null), 3000);
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (c.rif && c.rif.toLowerCase().includes(filtro.toLowerCase())) ||
      c.email.toLowerCase().includes(filtro.toLowerCase()) ||
      (c.empresa && c.empresa.toLowerCase().includes(filtro.toLowerCase()))
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Cartera de Clientes</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión y seguimiento comercial de cuentas, empresas e historial de compras.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {alerta && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{alerta}</span>
        </div>
      )}

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nombre, RIF, correo o empresa..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
        />
      </div>

      {/* Listado de Clientes */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">Cargando cartera de clientes...</div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No se encontraron clientes</p>
          <p className="text-xs text-slate-400 mt-1">Registra nuevos clientes para comenzar a gestionar ventas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm">
                      {cliente.nombre
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{cliente.nombre}</h3>
                        {cliente.rif && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded border border-blue-200">
                            {cliente.rif}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{cliente.empresa || "Cliente Particular"}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEliminarCliente(cliente.id, cliente.nombre)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                  {cliente.telefono && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{cliente.telefono}</span>
                    </div>
                  )}
                  {cliente.direccion && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cliente.direccion}</span>
                    </div>
                  )}
                </div>

                {cliente.notas && (
                  <p className="mt-3 p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-500 italic border border-slate-100">
                    "{cliente.notas}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Registrado el {new Date(cliente.creadoEn).toLocaleDateString("es-ES")}</span>
                <span className="text-blue-600 font-semibold cursor-pointer">Ver historial</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nuevo Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-fade-in relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Registrar Nuevo Cliente</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearCliente} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Carlos Mendoza"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RIF / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: J-12345678-9 o V-12345678-0"
                    value={form.rif}
                    onChange={(e) => setForm({ ...form, rif: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm uppercase font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="correo@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="+58 412 000-0000"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Empresa o Razón Social
                </label>
                <input
                  type="text"
                  placeholder="Ej: TechCorp Solutions"
                  value={form.empresa}
                  onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dirección Comercial / Fiscal
                </label>
                <input
                  type="text"
                  placeholder="Av. Principal, Edificio / Oficina..."
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas de Negociación / Perfil del Cliente
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles clave sobre preferencias de pago, frecuencia de compra..."
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Registrar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
