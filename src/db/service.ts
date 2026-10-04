import { getDb, isNeonConfigured } from "./index";
import { 
  clientes, 
  productos, 
  compras, 
  detallesCompra, 
  categorias,
  type Cliente, 
  type Producto, 
  type Compra,
  type Categoria 
} from "./schema";
import { eq, desc, sql, ilike } from "drizzle-orm";

export interface CategoriaConSubcategorias extends Categoria {
  subcategorias: Categoria[];
}

// Estado en memoria para desarrollo local si aún no se ha configurado la variable de entorno de Neon
export interface DetalleConProducto {
  id: string;
  productoId: string;
  nombreProducto: string;
  codigoSku: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface CompraCompleta extends Compra {
  clienteNombre: string;
  clienteEmpresa: string | null;
  detalles: DetalleConProducto[];
}

let mockClientes: Cliente[] = [
  {
    id: "c1-techcorp",
    nombre: "Carlos Mendoza",
    rif: "J-40192837-1",
    email: "cmendoza@techcorp.com",
    telefono: "+58 412 555-0101",
    empresa: "TechCorp Solutions",
    direccion: "Av. Francisco de Miranda, Torre Delta, Piso 8",
    notas: "Cliente preferencial corporativo, compras de TI a gran escala.",
    creadoEn: new Date("2024-01-15T10:00:00Z"),
  },
  {
    id: "c2-distnorte",
    nombre: "Mariana López",
    rif: "J-30819274-5",
    email: "mlopez@distnorte.com",
    telefono: "+58 414 789-2233",
    empresa: "Distribuidora del Norte",
    direccion: "Zona Industrial Los Cortijos, Galpón 14",
    notas: "Pagos puntuales por transferencia bancaria.",
    creadoEn: new Date("2024-02-10T14:30:00Z"),
  },
  {
    id: "c3-andinos",
    nombre: "Jorge Ramírez",
    rif: "J-50123984-2",
    email: "jramirez@andinos.com",
    telefono: "+58 424 991-8844",
    empresa: "Supermercados Andinos C.A.",
    direccion: "Centro Empresarial El Rosal, Ofic. 302",
    notas: "Cadena regional de retail con renovación de equipos semestral.",
    creadoEn: new Date("2024-03-05T09:15:00Z"),
  },
  {
    id: "c4-apex",
    nombre: "Valeria Soto",
    rif: "J-29837461-8",
    email: "vsoto@consultoraapex.com",
    telefono: "+58 416 333-7722",
    empresa: "Consultora Apex",
    direccion: "Calle Negrín, Centro Profesional Sabana Grande",
    notas: "Contratos de consultoría y estaciones de trabajo de alto rendimiento.",
    creadoEn: new Date("2024-04-18T16:00:00Z"),
  },
  {
    id: "c5-innova",
    nombre: "Gabriel Herrera",
    rif: "V-18765432-0",
    email: "gherrera@innovaretail.com",
    telefono: "+58 412 112-9900",
    empresa: "Innova Retail",
    direccion: "Centro San Ignacio, Nivel Jardín",
    notas: "Interesado en periféricos y monitores ultra panorámicos.",
    creadoEn: new Date("2024-05-22T11:45:00Z"),
  },
];

let mockProductos: Producto[] = [
  {
    id: "p1-laptop",
    codigoSku: "TECH-LAP-001",
    nombre: "Laptop Pro 15\" Core i7 32GB RAM",
    marca: "Dell",
    descripcion: "Estación de trabajo portátil para ingenieros y analistas con pantalla Retina.",
    categoria: "Computación",
    categoriaId: null,
    precio: "1350.00",
    stockActual: 12,
    activo: true,
    creadoEn: new Date("2024-01-10T08:00:00Z"),
  },
  {
    id: "p2-monitor",
    codigoSku: "DISP-MON-034",
    nombre: "Monitor UltraWide 34\" 4K Curved",
    marca: "LG",
    descripcion: "Monitor panorámico 144Hz con panel IPS y USB-C Hub.",
    categoria: "Periféricos",
    categoriaId: null,
    precio: "480.00",
    stockActual: 24,
    activo: true,
    creadoEn: new Date("2024-01-12T08:00:00Z"),
  },
  {
    id: "p3-teclado",
    codigoSku: "ACC-KEY-009",
    nombre: "Teclado Mecánico Inalámbrico RGB",
    marca: "Logitech",
    descripcion: "Switches táctiles silenciosos, batería de 4000mAh y conectividad dual.",
    categoria: "Periféricos",
    categoriaId: null,
    precio: "95.00",
    stockActual: 50,
    activo: true,
    creadoEn: new Date("2024-01-12T08:00:00Z"),
  },
  {
    id: "p4-servidor",
    codigoSku: "SRV-RACK-001",
    nombre: "Servidor Rack 1U Xeon 64GB 2TB NVMe",
    marca: "HPE",
    descripcion: "Servidor empresarial de alto rendimiento con fuentes redundantes.",
    categoria: "Infraestructura",
    categoriaId: null,
    precio: "2600.00",
    stockActual: 6,
    activo: true,
    creadoEn: new Date("2024-02-01T08:00:00Z"),
  },
  {
    id: "p5-switch",
    codigoSku: "NET-SW-024",
    nombre: "Switch Administrable 24 Puertos Gigabit PoE+",
    marca: "Cisco",
    descripcion: "Switch gestionado capa 2+ con 4 enlaces uplink SFP 10G.",
    categoria: "Redes",
    categoriaId: null,
    precio: "380.00",
    stockActual: 18,
    activo: true,
    creadoEn: new Date("2024-02-05T08:00:00Z"),
  },
  {
    id: "p6-licencia",
    codigoSku: "SFT-ENT-001",
    nombre: "Licencia Cloud Enterprise (Anual)",
    marca: "Microsoft",
    descripcion: "Suscripción a suite de ciberseguridad y respaldo continuo en la nube.",
    categoria: "Software",
    categoriaId: null,
    precio: "850.00",
    stockActual: 100,
    activo: true,
    creadoEn: new Date("2024-02-15T08:00:00Z"),
  },
];

let mockCompras: CompraCompleta[] = [
  {
    id: "ord-1001",
    clienteId: "c1-techcorp",
    clienteNombre: "Carlos Mendoza",
    clienteEmpresa: "TechCorp Solutions",
    numeroFactura: "FAC-2024-001",
    fechaCompra: new Date("2024-05-10T14:00:00Z"),
    total: "5300.00",
    estado: "completada",
    metodoPago: "transferencia",
    notas: "Despachado a sede principal de TechCorp.",
    creadoEn: new Date("2024-05-10T14:00:00Z"),
    detalles: [
      {
        id: "d1",
        productoId: "p1-laptop",
        nombreProducto: "Laptop Pro 15\" Core i7 32GB RAM",
        codigoSku: "TECH-LAP-001",
        cantidad: 2,
        precioUnitario: 1350.0,
        subtotal: 2700.0,
      },
      {
        id: "d2",
        productoId: "p4-servidor",
        nombreProducto: "Servidor Rack 1U Xeon 64GB 2TB NVMe",
        codigoSku: "SRV-RACK-001",
        cantidad: 1,
        precioUnitario: 2600.0,
        subtotal: 2600.0,
      },
    ],
  },
  {
    id: "ord-1002",
    clienteId: "c2-distnorte",
    clienteNombre: "Mariana López",
    clienteEmpresa: "Distribuidora del Norte",
    numeroFactura: "FAC-2024-002",
    fechaCompra: new Date("2024-05-18T10:30:00Z"),
    total: "1440.00",
    estado: "completada",
    metodoPago: "tarjeta",
    notas: "Equipamiento para oficina comercial.",
    creadoEn: new Date("2024-05-18T10:30:00Z"),
    detalles: [
      {
        id: "d3",
        productoId: "p2-monitor",
        nombreProducto: "Monitor UltraWide 34\" 4K Curved",
        codigoSku: "DISP-MON-034",
        cantidad: 3,
        precioUnitario: 480.0,
        subtotal: 1440.0,
      },
    ],
  },
  {
    id: "ord-1003",
    clienteId: "c3-andinos",
    clienteNombre: "Jorge Ramírez",
    clienteEmpresa: "Supermercados Andinos C.A.",
    numeroFactura: "FAC-2024-003",
    fechaCompra: new Date("2024-06-02T16:15:00Z"),
    total: "1610.00",
    estado: "completada",
    metodoPago: "transferencia",
    notas: "Instalación de red para sucursal oeste.",
    creadoEn: new Date("2024-06-02T16:15:00Z"),
    detalles: [
      {
        id: "d4",
        productoId: "p5-switch",
        nombreProducto: "Switch Administrable 24 Puertos Gigabit PoE+",
        codigoSku: "NET-SW-024",
        cantidad: 2,
        precioUnitario: 380.0,
        subtotal: 760.0,
      },
      {
        id: "d5",
        productoId: "p6-licencia",
        nombreProducto: "Licencia Cloud Enterprise (Anual)",
        codigoSku: "SFT-ENT-001",
        cantidad: 1,
        precioUnitario: 850.0,
        subtotal: 850.0,
      },
    ],
  },
  {
    id: "ord-1004",
    clienteId: "c4-apex",
    clienteNombre: "Valeria Soto",
    clienteEmpresa: "Consultora Apex",
    numeroFactura: "FAC-2024-06-004",
    fechaCompra: new Date("2024-06-15T11:00:00Z"),
    total: "3275.00",
    estado: "completada",
    metodoPago: "credito",
    notas: "Facturación a 30 días según contrato marco.",
    creadoEn: new Date("2024-06-15T11:00:00Z"),
    detalles: [
      {
        id: "d6",
        productoId: "p1-laptop",
        nombreProducto: "Laptop Pro 15\" Core i7 32GB RAM",
        codigoSku: "TECH-LAP-001",
        cantidad: 2,
        precioUnitario: 1350.0,
        subtotal: 2700.0,
      },
      {
        id: "d7",
        productoId: "p3-teclado",
        nombreProducto: "Teclado Mecánico Inalámbrico RGB",
        codigoSku: "ACC-KEY-009",
        cantidad: 5,
        precioUnitario: 95.0,
        subtotal: 475.0,
      },
      {
        id: "d8",
        productoId: "p2-monitor",
        nombreProducto: "Monitor UltraWide 34\" 4K Curved",
        codigoSku: "DISP-MON-034",
        cantidad: 1,
        precioUnitario: 480.0,
        subtotal: 480.0,
      },
    ],
  },
  {
    id: "ord-1005",
    clienteId: "c5-innova",
    clienteNombre: "Gabriel Herrera",
    clienteEmpresa: "Innova Retail",
    numeroFactura: "FAC-2024-06-005",
    fechaCompra: new Date("2024-06-25T09:40:00Z"),
    total: "850.00",
    estado: "pendiente",
    metodoPago: "transferencia",
    notas: "Esperando confirmación de comprobante bancario.",
    creadoEn: new Date("2024-06-25T09:40:00Z"),
    detalles: [
      {
        id: "d9",
        productoId: "p6-licencia",
        nombreProducto: "Licencia Cloud Enterprise (Anual)",
        codigoSku: "SFT-ENT-001",
        cantidad: 1,
        precioUnitario: 850.0,
        subtotal: 850.0,
      },
    ],
  },
];

export const DataService = {
  isNeonActive: () => isNeonConfigured,

  // CLIENTES
  async getClientes(): Promise<Cliente[]> {
    const db = getDb();
    if (db) {
      try {
        return await db.select().from(clientes).orderBy(desc(clientes.creadoEn));
      } catch (err) {
        console.error("Error consultando Neon, usando fallback:", err);
      }
    }
    return [...mockClientes].sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime());
  },

  async getClienteById(id: string): Promise<Cliente | null> {
    const db = getDb();
    if (db) {
      try {
        const res = await db.select().from(clientes).where(eq(clientes.id, id));
        return res[0] || null;
      } catch (err) {
        console.error("Error consultando cliente en Neon:", err);
      }
    }
    return mockClientes.find((c) => c.id === id) || null;
  },

  async createCliente(data: Omit<Cliente, "id" | "creadoEn">): Promise<Cliente> {
    const db = getDb();
    if (db) {
      try {
        const [inserted] = await db.insert(clientes).values(data).returning();
        return inserted;
      } catch (err) {
        console.error("Error guardando cliente en Neon:", err);
      }
    }
    const nuevo: Cliente = {
      id: "c-" + Date.now(),
      ...data,
      creadoEn: new Date(),
    };
    mockClientes.unshift(nuevo);
    return nuevo;
  },

  async deleteCliente(id: string): Promise<boolean> {
    const db = getDb();
    if (db) {
      try {
        await db.delete(clientes).where(eq(clientes.id, id));
        return true;
      } catch (err) {
        console.error("Error eliminando cliente en Neon:", err);
      }
    }
    mockClientes = mockClientes.filter((c) => c.id !== id);
    mockCompras = mockCompras.filter((ord) => ord.clienteId !== id);
    return true;
  },

  // CATEGORÍAS
  async getCategorias(): Promise<Categoria[]> {
    const db = getDb();
    if (db) {
      try {
        return await db.select().from(categorias).where(eq(categorias.activo, true)).orderBy(categorias.nombre);
      } catch (err) {
        console.error("Error consultando categorías en Neon:", err);
      }
    }
    return [];
  },

  async getCategoriasArbol(): Promise<CategoriaConSubcategorias[]> {
    const db = getDb();
    if (db) {
      try {
        const todas = await db.select().from(categorias).where(eq(categorias.activo, true)).orderBy(categorias.nombre);
        const principales = todas.filter((c) => !c.categoriaPadreId);
        return principales.map((padre) => ({
          ...padre,
          subcategorias: todas.filter((sub) => sub.categoriaPadreId === padre.id),
        }));
      } catch (err) {
        console.error("Error consultando árbol de categorías en Neon:", err);
      }
    }
    return [];
  },

  async getOrCreateSubcategoria(nombreSubcat: string, nombrePadreSugerido?: string): Promise<string | null> {
    const db = getDb();
    if (!db || !nombreSubcat?.trim()) return null;

    try {
      const limpia = nombreSubcat.trim();
      const existentes = await db.select().from(categorias);
      const encontrada = existentes.find(
        (c) => c.nombre.trim().toLowerCase() === limpia.toLowerCase() && c.categoriaPadreId !== null
      );
      if (encontrada) return encontrada.id;

      let padreNombre = nombrePadreSugerido || (limpia.toLowerCase().includes("filtro") ? "FILTRO LYC" : "FRENO LYC");
      let padre = existentes.find((c) => c.categoriaPadreId === null && c.nombre.toLowerCase() === padreNombre.toLowerCase());
      if (!padre) {
        padre = existentes.find((c) => c.categoriaPadreId === null && c.nombre.toUpperCase() === "FRENO LYC");
      }

      const [nueva] = await db
        .insert(categorias)
        .values({
          nombre: limpia.toUpperCase(),
          categoriaPadreId: padre ? padre.id : null,
          descripcion: "Creada automáticamente desde importación",
          activo: true,
        })
        .returning();
      return nueva ? nueva.id : null;
    } catch (err) {
      console.error("Error en getOrCreateSubcategoria:", err);
      return null;
    }
  },

  // PRODUCTOS
  async getProductos(): Promise<(Producto & { categoriaPrincipalNombre?: string })[]> {
    const db = getDb();
    if (db) {
      try {
        const prods = await db.select().from(productos).orderBy(productos.codigoSku);
        const cats = await db.select().from(categorias);
        const catMap = new Map(cats.map((c) => [c.id, c]));

        return prods.map((p) => {
          let principalNombre: string | undefined;
          if (p.categoriaId && catMap.has(p.categoriaId)) {
            const sub = catMap.get(p.categoriaId)!;
            if (sub.categoriaPadreId && catMap.has(sub.categoriaPadreId)) {
              principalNombre = catMap.get(sub.categoriaPadreId)!.nombre;
            }
          }
          return {
            ...p,
            categoriaPrincipalNombre: principalNombre,
          };
        });
      } catch (err) {
        console.error("Error consultando productos en Neon:", err);
      }
    }
    return [...mockProductos].sort((a, b) => (a.codigoSku || "").localeCompare(b.codigoSku || "", undefined, { numeric: true }));
  },

  async createProducto(data: Omit<Producto, "id" | "creadoEn">): Promise<Producto> {
    const db = getDb();
    if (db) {
      try {
        let catId = data.categoriaId ?? null;
        if (!catId && data.categoria) {
          catId = (await this.getOrCreateSubcategoria(data.categoria)) || null;
        }
        const [inserted] = await db.insert(productos).values({ ...data, categoriaId: catId }).returning();
        return inserted;
      } catch (err) {
        console.error("Error creando producto en Neon:", err);
      }
    }
    const nuevo: Producto = {
      id: "p-" + Date.now(),
      ...data,
      creadoEn: new Date(),
    };
    mockProductos.unshift(nuevo);
    return nuevo;
  },

  async createProductosBatch(items: Array<Omit<Producto, "id" | "creadoEn">>): Promise<number> {
    if (items.length === 0) return 0;
    const db = getDb();
    if (db) {
      try {
        const todasCats = await db.select().from(categorias);
        const principalesMap = new Map(todasCats.filter((c) => c.categoriaPadreId === null).map((c) => [c.nombre.toUpperCase(), c.id]));
        const scopedSubcatsMap = new Map(todasCats.filter((c) => c.categoriaPadreId !== null).map((c) => [`${c.categoriaPadreId}_${c.nombre.toUpperCase()}`, c.id]));
        const subcatsMap = new Map(todasCats.filter((c) => c.categoriaPadreId !== null).map((c) => [c.nombre.toUpperCase(), c.id]));
        const filtroPadre = todasCats.find((c) => c.nombre === "FILTRO LYC");
        const frenoPadre = todasCats.find((c) => c.nombre === "FRENO LYC");

        for (const item of items as any[]) {
          let catId = item.categoriaId;
          if (!catId && item.categoria) {
            const catNombreUpper = item.categoria.trim().toUpperCase();
            let padreId: string | null = null;
            if (item.categoriaPrincipalNombre && principalesMap.has(item.categoriaPrincipalNombre.toUpperCase())) {
              padreId = principalesMap.get(item.categoriaPrincipalNombre.toUpperCase())!;
            } else if (catNombreUpper.includes("FILTRO")) {
              padreId = filtroPadre?.id || null;
            } else {
              padreId = frenoPadre?.id || null;
            }

            const scopedKey = padreId ? `${padreId}_${catNombreUpper}` : null;
            if (scopedKey && scopedSubcatsMap.has(scopedKey)) {
              catId = scopedSubcatsMap.get(scopedKey);
            } else if (!scopedKey && subcatsMap.has(catNombreUpper)) {
              catId = subcatsMap.get(catNombreUpper);
            } else {
              const [nueva] = await db.insert(categorias).values({
                nombre: catNombreUpper,
                categoriaPadreId: padreId || null,
                descripcion: "Creada automáticamente desde importación",
                activo: true,
              }).returning();
              if (nueva) {
                if (padreId) scopedSubcatsMap.set(`${padreId}_${catNombreUpper}`, nueva.id);
                subcatsMap.set(catNombreUpper, nueva.id);
                catId = nueva.id;
              }
            }
          }

          await db
            .insert(productos)
            .values({
              ...item,
              categoriaId: catId,
            })
            .onConflictDoUpdate({
              target: productos.codigoSku,
              set: {
                nombre: item.nombre,
                marca: item.marca,
                descripcion: item.descripcion,
                categoria: item.categoria,
                categoriaId: catId || sql`excluded.categoria_id`,
                precio: item.precio,
                stockActual: item.stockActual,
                activo: item.activo,
              },
            });
        }
        return items.length;
      } catch (err) {
        console.error("Error en createProductosBatch en Neon:", err);
      }
    }

    // Fallback local
    for (const item of items) {
      const idx = mockProductos.findIndex((p) => p.codigoSku.toUpperCase() === item.codigoSku.toUpperCase());
      if (idx >= 0) {
        mockProductos[idx] = {
          ...mockProductos[idx],
          ...item,
        };
      } else {
        mockProductos.unshift({
          id: "p-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
          ...item,
          creadoEn: new Date(),
        });
      }
    }
    return items.length;
  },

  // COMPRAS
  async getCompras(): Promise<CompraCompleta[]> {
    const db = getDb();
    if (db) {
      try {
        const rawCompras = await db.query.compras.findMany({
          with: {
            cliente: true,
            detalles: {
              with: {
                producto: true,
              },
            },
          },
          orderBy: [desc(compras.fechaCompra)],
        });

        return rawCompras.map((compra) => ({
          ...compra,
          clienteNombre: compra.cliente.nombre,
          clienteEmpresa: compra.cliente.empresa,
          detalles: compra.detalles.map((d) => ({
            id: d.id,
            productoId: d.productoId,
            nombreProducto: d.producto.nombre,
            codigoSku: d.producto.codigoSku,
            cantidad: d.cantidad,
            precioUnitario: Number(d.precioUnitario),
            subtotal: Number(d.subtotal),
          })),
        }));
      } catch (err) {
        console.error("Error consultando compras en Neon:", err);
      }
    }
    return [...mockCompras].sort((a, b) => new Date(b.fechaCompra).getTime() - new Date(a.fechaCompra).getTime());
  },

  async createCompra(data: {
    clienteId: string;
    numeroFactura?: string;
    metodoPago: string;
    estado: string;
    notas?: string;
    fechaCompra?: string | Date;
    items: { productoId: string; cantidad: number; precioUnitario: number }[];
  }): Promise<CompraCompleta> {
    const cliente = await this.getClienteById(data.clienteId);
    if (!cliente) throw new Error("Cliente no encontrado");

    const totalCalculado = data.items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
    const numeroFactura = data.numeroFactura || `FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let fechaFinal = new Date();
    if (data.fechaCompra) {
      const parsed =
        typeof data.fechaCompra === "string" && !data.fechaCompra.includes("T")
          ? new Date(data.fechaCompra + "T12:00:00")
          : new Date(data.fechaCompra);
      if (!isNaN(parsed.getTime())) {
        fechaFinal = parsed;
      }
    }

    const db = getDb();
    if (db) {
      try {
        const [nuevaCompra] = await db
          .insert(compras)
          .values({
            clienteId: data.clienteId,
            numeroFactura,
            fechaCompra: fechaFinal,
            total: totalCalculado.toFixed(2),
            estado: data.estado || "completada",
            metodoPago: data.metodoPago || "transferencia",
            notas: data.notas || null,
          })
          .returning();

        const detallesParaInsertar = data.items.map((it) => ({
          compraId: nuevaCompra.id,
          productoId: it.productoId,
          cantidad: it.cantidad,
          precioUnitario: it.precioUnitario.toFixed(2),
          subtotal: (it.cantidad * it.precioUnitario).toFixed(2),
        }));

        await db.insert(detallesCompra).values(detallesParaInsertar);

        // Actualizar stock de productos
        for (const it of data.items) {
          await db
            .update(productos)
            .set({
              stockActual: sql`${productos.stockActual} - ${it.cantidad}`,
            })
            .where(eq(productos.id, it.productoId));
        }

        const lista = await this.getCompras();
        const encontrada = lista.find((c) => c.id === nuevaCompra.id);
        if (encontrada) return encontrada;
      } catch (err) {
        console.error("Error registrando compra en Neon:", err);
      }
    }

    // Fallback local
    const detalles: DetalleConProducto[] = data.items.map((it, idx) => {
      const prod = mockProductos.find((p) => p.id === it.productoId);
      if (prod) {
        prod.stockActual = Math.max(0, prod.stockActual - it.cantidad);
      }
      return {
        id: `d-${Date.now()}-${idx}`,
        productoId: it.productoId,
        nombreProducto: prod ? prod.nombre : "Producto",
        codigoSku: prod ? prod.codigoSku : "SKU",
        cantidad: it.cantidad,
        precioUnitario: it.precioUnitario,
        subtotal: it.cantidad * it.precioUnitario,
      };
    });

    const nuevaOrden: CompraCompleta = {
      id: `ord-${Date.now()}`,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      clienteEmpresa: cliente.empresa,
      numeroFactura,
      fechaCompra: fechaFinal,
      total: totalCalculado.toFixed(2),
      estado: data.estado || "completada",
      metodoPago: data.metodoPago || "transferencia",
      notas: data.notas || "",
      creadoEn: new Date(),
      detalles,
    };

    mockCompras.unshift(nuevaOrden);
    return nuevaOrden;
  },

  // ESTADÍSTICAS DEL ANALISTA
  async getDashboardStats() {
    const clientesList = await this.getClientes();
    const productosList = await this.getProductos();
    const comprasList = await this.getCompras();

    const totalVentas = comprasList
      .filter((c) => c.estado === "completada")
      .reduce((sum, c) => sum + Number(c.total), 0);

    const ticketPromedio =
      comprasList.length > 0 ? totalVentas / comprasList.filter((c) => c.estado === "completada").length : 0;

    // Top clientes por compras
    const comprasPorCliente: Record<string, { nombre: string; empresa: string; total: number; ordenes: number }> = {};
    comprasList.forEach((c) => {
      if (!comprasPorCliente[c.clienteId]) {
        comprasPorCliente[c.clienteId] = {
          nombre: c.clienteNombre,
          empresa: c.clienteEmpresa || "",
          total: 0,
          ordenes: 0,
        };
      }
      if (c.estado === "completada") {
        comprasPorCliente[c.clienteId].total += Number(c.total);
      }
      comprasPorCliente[c.clienteId].ordenes += 1;
    });

    const topClientes = Object.entries(comprasPorCliente)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Top productos más vendidos
    const ventasPorProducto: Record<string, { nombre: string; sku: string; cantidad: number; totalRecaudado: number }> = {};
    comprasList.forEach((c) => {
      c.detalles.forEach((d) => {
        if (!ventasPorProducto[d.productoId]) {
          ventasPorProducto[d.productoId] = {
            nombre: d.nombreProducto,
            sku: d.codigoSku,
            cantidad: 0,
            totalRecaudado: 0,
          };
        }
        ventasPorProducto[d.productoId].cantidad += d.cantidad;
        ventasPorProducto[d.productoId].totalRecaudado += d.subtotal;
      });
    });

    const topProductos = Object.entries(ventasPorProducto)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Alertas de stock bajo (menor o igual a 10 unidades)
    const stockBajo = productosList.filter((p) => p.stockActual <= 10 && p.activo);

    return {
      kpis: {
        totalVentas,
        ticketPromedio: Math.round(ticketPromedio * 100) / 100,
        totalClientes: clientesList.length,
        totalProductos: productosList.length,
        totalCompras: comprasList.length,
      },
      topClientes,
      topProductos,
      stockBajo,
      comprasRecientes: comprasList.slice(0, 8),
      isNeonConnected: isNeonConfigured,
    };
  },
};
