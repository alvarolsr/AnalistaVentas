# Analista de Ventas - Neon PostgreSQL & Vercel

Aplicación web empresarial para la gestión integral y análisis comercial de **Cartera de Clientes**, **Portafolio de Productos** y **Registro de Compras / Ventas**, diseñada para desplegarse en **Vercel** con base de datos serverless **Neon PostgreSQL**.

---

## Características Principales

1. **Dashboard de Analista de Ventas**:
   - KPIs en tiempo real: Ventas Totales, Ticket Promedio, Total de Clientes y Productos.
   - Ranking de Top Clientes por facturación acumulada.
   - Ranking de Productos Más Vendidos con ingresos por ítem.
   - Alerta inteligente de inventario para productos con stock bajo (\le 10 unidades).
   - Historial de transacciones recientes.

2. **Cartera de Clientes**:
   - Registro y gestión de clientes particulares y corporativos (Nombre, Razón Social, Email, Teléfono, Dirección y Notas comerciales).
   - Búsqueda en tiempo real por nombre, correo o empresa.
   - Historial de compras por cliente.

3. **Portafolio de Productos**:
   - Catálogo clasificado por categorías (Computación, Periféricos, Redes, Infraestructura, Software).
   - Control de inventario en tiempo real y precios unitarios en USD.
   - Búsqueda por SKU o nombre de producto.

4. **Registro de Compras / Facturación**:
   - Creación de órdenes de compra vinculando cliente y múltiples productos.
   - Cálculo automático de cantidades, subtotales y total a facturar.
   - Deducción automática de stock en inventario al completar la venta.
   - Métodos de pago (Transferencia, Tarjeta, Efectivo, Crédito Comercial) y estados (Completada, Pendiente, Cancelada).
   - Visualizador de comprobante y detalle de ítems.

5. **Integración Neon Serverless + Vercel**:
   - Conexión optimizada con `@neondatabase/serverless` y Drizzle ORM.
   - Botón de sincronización automática de tablas en el encabezado.
   - Modo de respaldo local (Demo Mode) para desarrollo o pruebas sin conexión inmediata a internet.

---

## Configuración y Despliegue

### 1. Conexión a Neon PostgreSQL
1. Crea un proyecto gratuito en [Neon Console](https://console.neon.tech).
2. Copia la cadena de conexión de tu base de datos (`postgres://...`).
3. Crea un archivo `.env.local` en la raíz del proyecto:
   ```env
   DATABASE_URL="postgresql://usuario:contraseña@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   POSTGRES_URL="postgresql://usuario:contraseña@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

### 2. Ejecución Local
```bash
# Instalar dependencias (si no se han instalado)
npm install

# Iniciar servidor de desarrollo
npm run dev
```
Abre en tu navegador [http://localhost:3000](http://localhost:3000).

### 3. Sincronizar Base de Datos Neon
- Puedes pulsar el botón **"Sincronizar Tablas"** directamente desde la barra superior de la aplicación.
- O ejecutar con Drizzle Kit:
  ```bash
  npm run db:push
  ```

### 4. Despliegue en Vercel
1. Sube el proyecto a tu repositorio de GitHub / GitLab / Bitbucket.
2. En [Vercel](https://vercel.com), crea un nuevo proyecto e importa el repositorio.
3. En la pestaña **Integrations** o **Storage** de Vercel, conecta **Neon Database**. Vercel inyectará automáticamente las variables `POSTGRES_URL` y `DATABASE_URL`.
4. ¡Listo! Tu aplicación estará en producción con escalado global automático.
