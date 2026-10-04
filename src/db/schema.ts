import { pgTable, uuid, varchar, text, numeric, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const clientes = pgTable("clientes", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  rif: varchar("rif", { length: 50 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  telefono: varchar("telefono", { length: 50 }),
  empresa: varchar("empresa", { length: 255 }),
  direccion: text("direccion"),
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const categorias = pgTable("categorias", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: varchar("nombre", { length: 150 }).notNull(),
  categoriaPadreId: uuid("categoria_padre_id").references((): any => categorias.id, { onDelete: "cascade" }),
  descripcion: text("descripcion"),
  activo: boolean("activo").default(true).notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const productos = pgTable("productos", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigoSku: varchar("codigo_sku", { length: 100 }).notNull().unique(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  marca: varchar("marca", { length: 100 }),
  descripcion: text("descripcion"),
  categoria: varchar("categoria", { length: 100 }).notNull(),
  categoriaId: uuid("categoria_id").references(() => categorias.id, { onDelete: "restrict" }),
  precio: numeric("precio", { precision: 12, scale: 2 }).notNull(),
  stockActual: integer("stock_actual").default(0).notNull(),
  activo: boolean("activo").default(true).notNull(),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const compras = pgTable("compras", {
  id: uuid("id").defaultRandom().primaryKey(),
  clienteId: uuid("cliente_id")
    .references(() => clientes.id, { onDelete: "cascade" })
    .notNull(),
  numeroFactura: varchar("numero_factura", { length: 100 }).notNull().unique(),
  fechaCompra: timestamp("fecha_compra", { withTimezone: true }).defaultNow().notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  estado: varchar("estado", { length: 50 }).default("completada").notNull(), // completada, pendiente, cancelada
  metodoPago: varchar("metodo_pago", { length: 50 }).default("transferencia").notNull(), // efectivo, transferencia, tarjeta, credito
  notas: text("notas"),
  creadoEn: timestamp("creado_en", { withTimezone: true }).defaultNow().notNull(),
});

export const detallesCompra = pgTable("detalles_compra", {
  id: uuid("id").defaultRandom().primaryKey(),
  compraId: uuid("compra_id")
    .references(() => compras.id, { onDelete: "cascade" })
    .notNull(),
  productoId: uuid("producto_id")
    .references(() => productos.id, { onDelete: "restrict" })
    .notNull(),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: numeric("precio_unitario", { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
});

// Relaciones Drizzle
export const clientesRelations = relations(clientes, ({ many }) => ({
  compras: many(compras),
}));

export const comprasRelations = relations(compras, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [compras.clienteId],
    references: [clientes.id],
  }),
  detalles: many(detallesCompra),
}));

export const categoriasRelations = relations(categorias, ({ one, many }) => ({
  padre: one(categorias, {
    fields: [categorias.categoriaPadreId],
    references: [categorias.id],
    relationName: "jerarquiaCategorias",
  }),
  subcategorias: many(categorias, {
    relationName: "jerarquiaCategorias",
  }),
  productos: many(productos),
}));

export const productosRelations = relations(productos, ({ one, many }) => ({
  categoriaRel: one(categorias, {
    fields: [productos.categoriaId],
    references: [categorias.id],
  }),
  detalles: many(detallesCompra),
}));

export const detallesCompraRelations = relations(detallesCompra, ({ one }) => ({
  compra: one(compras, {
    fields: [detallesCompra.compraId],
    references: [compras.id],
  }),
  producto: one(productos, {
    fields: [detallesCompra.productoId],
    references: [productos.id],
  }),
}));

export type Categoria = typeof categorias.$inferSelect;
export type NuevaCategoria = typeof categorias.$inferInsert;

export type Cliente = typeof clientes.$inferSelect;
export type NuevoCliente = typeof clientes.$inferInsert;

export type Producto = typeof productos.$inferSelect;
export type NuevoProducto = typeof productos.$inferInsert;

export type Compra = typeof compras.$inferSelect;
export type NuevaCompra = typeof compras.$inferInsert;

export type DetalleCompra = typeof detallesCompra.$inferSelect;
export type NuevoDetalleCompra = typeof detallesCompra.$inferInsert;
