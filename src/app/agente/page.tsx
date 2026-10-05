"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Sliders,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Key,
  Database,
  TrendingUp,
  Package,
  Users,
  AlertCircle,
  Paperclip,
  FileText,
  X
} from "lucide-react";

interface ArchivoAdjunto {
  nombre: string;
  tipo: string;
  base64: string;
  tamaño?: string;
}

interface Mensaje {
  id: string;
  role: "user" | "assistant";
  content: string;
  adjunto?: {
    nombre: string;
    tipo: string;
  };
  timestamp: string;
}

const PREGUNTAS_SUGERIDAS = [
  "¿Cuáles son los 3 clientes con mayor facturación?",
  "¿Qué productos tienen bajo inventario y requieren reposición?",
  "Recomiéndame una estrategia para incrementar el ticket promedio",
  "¿Cuáles son las marcas más vendidas en nuestro catálogo?",
  "Genera un reporte ejecutivo de las ventas actuales"
];

const INDICACIONES_POR_DEFECTO = `1. Tono ejecutivo, estratégico y conciso.
2. Priorizar oportunidades de venta cruzada con clientes corporativos recurrentes.
3. Alertar proactivamente cuando un producto tenga 10 unidades o menos en stock.
4. Siempre presentar cifras de dinero formateadas en dólares ($ USD).`;

export default function AgenteChatPage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Modal / Drawer de Indicaciones Personalizadas
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [indicaciones, setIndicaciones] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelo, setModelo] = useState("gemini-3.6-flash");
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  // Archivo Adjunto en el Chat
  const [archivoAdjunto, setArchivoAdjunto] = useState<ArchivoAdjunto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar estado inicial desde localStorage
  useEffect(() => {
    const savedIndicaciones = localStorage.getItem("gemini_custom_instructions");
    if (savedIndicaciones !== null) {
      setIndicaciones(savedIndicaciones);
    } else {
      setIndicaciones(INDICACIONES_POR_DEFECTO);
    }

    const savedKey = localStorage.getItem("gemini_api_key");
    if (savedKey) setApiKey(savedKey);

    const savedModelo = localStorage.getItem("gemini_selected_model");
    if (savedModelo) setModelo(savedModelo);

    const savedHistory = localStorage.getItem("gemini_chat_history");
    if (savedHistory) {
      try {
        setMensajes(JSON.parse(savedHistory));
      } catch {
        setMensajes(mensajeBienvenida());
      }
    } else {
      setMensajes(mensajeBienvenida());
    }
  }, []);

  // Guardar historial en localStorage
  useEffect(() => {
    if (mensajes.length > 0) {
      localStorage.setItem("gemini_chat_history", JSON.stringify(mensajes));
    }
  }, [mensajes]);

  // Auto scroll hacia el último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  function mensajeBienvenida(): Mensaje[] {
    return [
      {
        id: "msg-welcome",
        role: "assistant",
        content: `👋 **¡Hola! Soy tu Agente Analista de Ventas con Gemini.**

Tengo acceso en tiempo real a tu base de datos **Neon PostgreSQL**:
- Cartera de clientes y RIFs
- Catálogo de productos, marcas, SKUs y niveles de stock
- Registro histórico de compras y métricas de ventas

Puedes consultarme análisis comerciales, balances de inventario o darme **indicaciones personalizadas** en el panel de configuración para que ajuste mis recomendaciones a los objetivos de tu empresa.

¿En qué te puedo ayudar hoy?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  }

  const handleGuardarConfiguracion = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("gemini_custom_instructions", indicaciones);
    localStorage.setItem("gemini_selected_model", modelo);
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey.trim());
    } else {
      localStorage.removeItem("gemini_api_key");
    }
    setGuardadoExitoso(true);
    setTimeout(() => {
      setGuardadoExitoso(false);
      setMostrarConfig(false);
    }, 1500);
  };

  const handleLimpiarConversacion = () => {
    if (confirm("¿Deseas reiniciar la conversación con el Agente?")) {
      const inicial = mensajeBienvenida();
      setMensajes(inicial);
      localStorage.setItem("gemini_chat_history", JSON.stringify(inicial));
    }
  };

  const handleCopiar = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Límite de 10 MB para inline base64
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo no debe superar los 10 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      const sizeKb = Math.round(file.size / 1024);
      const sizeText = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      setArchivoAdjunto({
        nombre: file.name,
        tipo: file.type || "application/octet-stream",
        base64: base64String,
        tamaño: sizeText,
      });
    };
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const enviarMensaje = async (texto: string) => {
    if ((!texto.trim() && !archivoAdjunto) || cargando) return;

    const textoEnvio = texto.trim() || (archivoAdjunto ? `Analiza el documento adjunto: ${archivoAdjunto.nombre}` : "");
    const adjuntoActual = archivoAdjunto;

    const nuevoMensajeUsuario: Mensaje = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textoEnvio,
      adjunto: adjuntoActual
        ? {
            nombre: adjuntoActual.nombre,
            tipo: adjuntoActual.tipo,
          }
        : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nuevosMensajes = [...mensajes, nuevoMensajeUsuario];
    setMensajes(nuevosMensajes);
    setInput("");
    setArchivoAdjunto(null);
    setCargando(true);

    try {
      // Formatear historial para la API
      const historialPayload = nuevosMensajes.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const res = await fetch("/api/agente/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: textoEnvio,
          historial: historialPayload.slice(-8),
          indicacionesPersonalizadas: indicaciones,
          modelo: modelo,
          adjunto: adjuntoActual
            ? {
                nombre: adjuntoActual.nombre,
                tipo: adjuntoActual.tipo,
                base64: adjuntoActual.base64,
              }
            : undefined,
          apiKey: apiKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.respuesta) {
        const respuestaModelo: Mensaje = {
          id: `model-${Date.now()}`,
          role: "assistant",
          content: data.respuesta,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMensajes((prev) => [...prev, respuestaModelo]);
      } else {
        const errorMsg: Mensaje = {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Aviso del Agente:** ${data.error || "No se pudo procesar la respuesta."}\n\n*Tip: Si no has definido \`GEMINI_API_KEY\` en \`.env.local\`, puedes ingresarla en el botón de configuración superior.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMensajes((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error("Error al comunicar con agente:", err);
      const errorMsg: Mensaje = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `❌ **Error de conexión:** No fue posible contactar con el servicio del Agente. Verifica tu conexión o credenciales.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMensajes((prev) => [...prev, errorMsg]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100dvh-10rem)] md:h-[calc(100vh-8.5rem)] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      {/* Barra Superior del Agente */}
      <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="p-2 bg-gradient-to-tr from-purple-500 to-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/25 shrink-0">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold tracking-tight truncate">Agente Analista</h2>
              <button
                type="button"
                onClick={() => setMostrarConfig(true)}
                title="Clic para cambiar modelo en configuración"
                className="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-[9px] sm:text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 transition"
              >
                {modelo === "gemini-3.8-flash"
                  ? "Gemini 3.8 Flash"
                  : modelo === "gemini-3.5-flash"
                  ? "Gemini 3.5 Flash"
                  : modelo === "gemini-3.5-flash-lite"
                  ? "Gemini 3.5 Lite"
                  : "Gemini 3.6 Flash"}
              </button>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-1.5 truncate">
              <Database className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">Neon Postgres</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarConfig(true)}
            title="Configurar Indicaciones Personalizadas del Agente"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl transition"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-300" />
            <span>Indicaciones</span>
          </button>

          <button
            onClick={handleLimpiarConversacion}
            title="Reiniciar chat"
            className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-white/10 rounded-xl transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/50">
        {mensajes.map((msg) => {
          const esUsuario = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${esUsuario ? "ml-auto flex-row-reverse" : "mr-auto"}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  esUsuario
                    ? "bg-blue-600 text-white"
                    : "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white"
                }`}
              >
                {esUsuario ? (
                  <span className="text-xs font-bold">Tú</span>
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-1 max-w-[85%]">
                {/* Indicador visual de archivo adjunto en el mensaje */}
                {msg.adjunto && (
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl mb-1 text-xs border ${
                      esUsuario
                        ? "bg-blue-700/80 text-white border-blue-500"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="font-semibold truncate max-w-xs">{msg.adjunto.nombre}</span>
                    <span className="text-[10px] opacity-75 uppercase">({msg.adjunto.tipo.split("/")[1] || "archivo"})</span>
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl shadow-xs text-sm leading-relaxed whitespace-pre-wrap ${
                    esUsuario
                      ? "bg-blue-600 text-white rounded-tr-none font-medium"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-none prose prose-sm max-w-none"
                  }`}
                >
                  {msg.content}
                </div>

                <div className={`flex items-center gap-2 px-1 text-[11px] text-slate-400 ${esUsuario ? "justify-end" : "justify-start"}`}>
                  <span>{msg.timestamp}</span>
                  {!esUsuario && (
                    <button
                      onClick={() => handleCopiar(msg.id, msg.content)}
                      className="hover:text-slate-600 p-0.5 rounded transition"
                      title="Copiar respuesta"
                    >
                      {copiadoId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {cargando && (
          <div className="flex gap-3 max-w-xl mr-auto animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-xs text-xs text-slate-500 flex items-center gap-2.5">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
              <span>Analizando datos y preparando recomendaciones comerciales...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preguntas Sugeridas */}
      {mensajes.length <= 2 && !cargando && (
        <div className="px-6 py-2 bg-slate-50 border-t border-slate-200/70 flex items-center gap-2 overflow-x-auto shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Sugerencias:</span>
          {PREGUNTAS_SUGERIDAS.map((pregunta, idx) => (
            <button
              key={idx}
              onClick={() => enviarMensaje(pregunta)}
              className="text-xs bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-600 border border-slate-200 px-3 py-1 rounded-full whitespace-nowrap transition shadow-xs"
            >
              {pregunta}
            </button>
          ))}
        </div>
      )}

      {/* Input de Envío y Botón de Adjuntar */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 space-y-2">
        {/* Vista previa del archivo listo para enviar */}
        {archivoAdjunto && (
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-xl text-xs text-indigo-900 animate-fade-in">
            <div className="flex items-center gap-2.5 truncate">
              <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="font-semibold truncate">{archivoAdjunto.nombre}</p>
                <p className="text-[10px] text-indigo-600">{archivoAdjunto.tamaño} • Listo para analizar con Gemini</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setArchivoAdjunto(null)}
              className="text-indigo-400 hover:text-rose-600 p-1 transition"
              title="Quitar archivo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviarMensaje(input);
          }}
          className="flex items-center gap-2"
        >
          {/* Input oculto de archivos */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
            onChange={handleSeleccionarArchivo}
            className="hidden"
          />

          {/* Botón Adjuntar Archivo */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={cargando}
            title="Adjuntar archivo (PDF, Imagen, CSV, Texto)"
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition disabled:opacity-40 shrink-0 flex items-center justify-center"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder={
              archivoAdjunto
                ? `Añade instrucciones para ${archivoAdjunto.nombre} o pulsa Enviar...`
                : "Pregúntale al Agente o adjunta un archivo (PDF, factura, cotización, lista de precios)..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={cargando}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
          />

          <button
            type="submit"
            disabled={(!input.trim() && !archivoAdjunto) || cargando}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition flex items-center gap-2 shrink-0"
          >
            <span>Enviar</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* MODAL: INDICACIONES PERSONALIZADAS DEL AGENTE */}
      {mostrarConfig && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Indicaciones Personalizadas del Agente
                  </h3>
                  <p className="text-xs text-slate-500">
                    Define directrices, reglas de negocio o prioridades que el agente considerará en cada análisis.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleGuardarConfiguracion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Directrices e Instrucciones de Negocio:
                </label>
                <textarea
                  rows={6}
                  value={indicaciones}
                  onChange={(e) => setIndicaciones(e.target.value)}
                  placeholder="Ej: Priorizar productos de la marca Apple, mantener tono ejecutivo, avisar si un cliente tiene más de 3 compras..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-mono leading-relaxed"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Estas instrucciones se inyectan automáticamente en el prompt del sistema de Gemini.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Modelo de Inteligencia Artificial:</span>
                </label>
                <select
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 font-medium"
                >
                  <option value="gemini-3.5-flash">
                    💎 Gemini 3.5 Flash (Mayor cuota de peticiones RPD diarias)
                  </option>
                  <option value="gemini-3.6-flash">
                    ⚡ Gemini 3.6 Flash (Alta capacidad analítica)
                  </option>
                  <option value="gemini-3.5-flash-lite">
                    🚀 Gemini 3.5 Flash Lite (Ultra liviano — menor latencia)
                  </option>
                  <option value="gemini-3.8-flash">
                    ✨ Gemini 3.8 Flash (Última versión — sujeto a picos de demanda de Google)
                  </option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Si el modelo seleccionado experimenta alta demanda en los servidores de Google, el sistema pasa automáticamente al siguiente modelo Flash sin interrumpir tu chat.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  <span>Google Gemini API Key (Opcional si ya está en .env.local):</span>
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Puedes configurar la variable `GEMINI_API_KEY` en tu archivo `.env.local` o ingresarla aquí.
                </p>
              </div>

              {guardadoExitoso && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Indicaciones personalizadas guardadas con éxito!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMostrarConfig(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
                >
                  Guardar Directrices
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}