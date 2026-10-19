import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const sql = neon(connectionString);

interface InvoiceItem {
  sku: string;
  cantidad: number;
  precioUnitario: number;
}

interface InvoiceData {
  numeroFactura: string;
  fechaCompra: string;
  total: number;
  notas: string;
  items: InvoiceItem[];
}

const invoices: InvoiceData[] = [
  // 1. Factura 2000020328 ($965.01)
  {
    numeroFactura: "2000020328",
    fechaCompra: "2026-07-08T12:00:00Z",
    total: 965.01,
    notas: "Pedido Cliente PCLI #: 0000009431. Condición: CREDITO 30 DIAS. Vencimiento: 07/08/2026. Dirección de Entrega: CALLE 148 CASA NRO 52A BARRIO SUR AMERICA SUR AMERICA ZULIA ZONA POSTAL 4004. Vendedor: ALVARO LUIS SALAZAR RAMOS. Usuario: ASIST COORDINADOR.",
    items: [
      { sku: "ENFB-0016", cantidad: 1, precioUnitario: 26.00 },
      { sku: "ENFB-0005", cantidad: 1, precioUnitario: 65.00 },
      { sku: "ENFB-0001", cantidad: 1, precioUnitario: 23.83 },
      { sku: "ENFB-0007", cantidad: 1, precioUnitario: 22.75 },
      { sku: "ENFB-0009", cantidad: 1, precioUnitario: 19.18 },
      { sku: "ENDP-0004", cantidad: 1, precioUnitario: 22.78 },
      { sku: "ENDP-0006", cantidad: 1, precioUnitario: 33.15 },
      { sku: "DTCL-0004", cantidad: 2, precioUnitario: 22.53 },
      { sku: "DTCL-0005", cantidad: 2, precioUnitario: 14.30 },
      { sku: "DTCL-0011", cantidad: 1, precioUnitario: 16.47 },
      { sku: "DTCU-0002", cantidad: 2, precioUnitario: 22.06 },
      { sku: "DTCU-0012", cantidad: 2, precioUnitario: 17.23 },
      { sku: "DTCU-0009", cantidad: 2, precioUnitario: 15.60 },
      { sku: "DTCU-0019", cantidad: 1, precioUnitario: 23.40 },
      { sku: "DTBC-0002", cantidad: 2, precioUnitario: 23.48 },
      { sku: "ACBA-0010", cantidad: 2, precioUnitario: 19.07 },
      { sku: "ENBT-0013", cantidad: 2, precioUnitario: 9.19 },
      { sku: "ENBT-0014", cantidad: 2, precioUnitario: 9.39 },
      { sku: "ENBT-0016", cantidad: 2, precioUnitario: 11.79 },
      { sku: "ENBT-0023", cantidad: 4, precioUnitario: 4.71 },
      { sku: "ENHG-0013", cantidad: 1, precioUnitario: 16.00 },
      { sku: "ENAF-6002", cantidad: 1, precioUnitario: 12.13 },
      { sku: "ENAF-1015", cantidad: 2, precioUnitario: 13.76 },
      { sku: "ENAF-1013", cantidad: 1, precioUnitario: 19.50 },
      { sku: "DTBC-1001", cantidad: 1, precioUnitario: 19.53 },
      { sku: "DTCB-0001", cantidad: 2, precioUnitario: 20.69 },
      { sku: "DTCB-0007", cantidad: 1, precioUnitario: 23.40 },
      { sku: "DTCB-0005", cantidad: 1, precioUnitario: 19.92 },
      { sku: "ACGO-0003", cantidad: 1, precioUnitario: 26.00 },
      { sku: "ENET-0011", cantidad: 1, precioUnitario: 16.47 },
      { sku: "ENCO-1002", cantidad: 1, precioUnitario: 63.38 },
      { sku: "BKVB-0002", cantidad: 1, precioUnitario: 21.00 },
      { sku: "BKVB-0019", cantidad: 1, precioUnitario: 19.10 },
      { sku: "BKVB-0010", cantidad: 1, precioUnitario: 39.00 },
    ],
  },

  // 2. Factura 2000019598 ($766.81)
  {
    numeroFactura: "2000019598",
    fechaCompra: "2026-05-22T12:00:00Z",
    total: 766.81,
    notas: "Pedido Cliente PCLI #: 0000008512. Condición: CREDITO 30 DIAS. Vencimiento: 21/06/2026. Dirección de Entrega: CALLE 148 CASA NRO 52A BARRIO SUR AMERICA SUR AMERICA ZULIA ZONA POSTAL 4004. Vendedor: ALVARO LUIS SALAZAR RAMOS. Usuario: ASISTENTE ADMINSTRATIVO.",
    items: [
      { sku: "ENTC-1005", cantidad: 2, precioUnitario: 10.68 },
      { sku: "ENTC-1014", cantidad: 2, precioUnitario: 14.45 },
      { sku: "ENFB-0009", cantidad: 1, precioUnitario: 19.18 },
      { sku: "BKBP-0007", cantidad: 1, precioUnitario: 47.94 },
      { sku: "BKBP-0004", cantidad: 1, precioUnitario: 32.50 },
      { sku: "BKBP-0009", cantidad: 1, precioUnitario: 40.17 },
      { sku: "DTCL-0007", cantidad: 1, precioUnitario: 10.73 },
      { sku: "DTCU-0017", cantidad: 1, precioUnitario: 21.23 },
      { sku: "DTCU-0002", cantidad: 1, precioUnitario: 22.06 },
      { sku: "DTCU-0016", cantidad: 1, precioUnitario: 19.93 },
      { sku: "DTCU-0004", cantidad: 1, precioUnitario: 16.90 },
      { sku: "DTCU-0006", cantidad: 1, precioUnitario: 18.53 },
      { sku: "DTBC-0002", cantidad: 1, precioUnitario: 23.48 },
      { sku: "ENBT-0016", cantidad: 2, precioUnitario: 11.79 },
      { sku: "ACMR-0001", cantidad: 2, precioUnitario: 8.82 },
      { sku: "DTCC-0001", cantidad: 1, precioUnitario: 17.02 },
      { sku: "DTDP-0002", cantidad: 1, precioUnitario: 20.00 },
      { sku: "DTDP-0003", cantidad: 1, precioUnitario: 24.00 },
      { sku: "DTBC-1002", cantidad: 1, precioUnitario: 21.67 },
      { sku: "DTCB-0001", cantidad: 1, precioUnitario: 20.69 },
      { sku: "DTCB-0007", cantidad: 1, precioUnitario: 23.40 },
      { sku: "ACGO-0003", cantidad: 1, precioUnitario: 26.00 },
      { sku: "DTSV-0004", cantidad: 1, precioUnitario: 36.98 },
      { sku: "DTSV-0003", cantidad: 1, precioUnitario: 44.00 },
      { sku: "ENCO-1003", cantidad: 1, precioUnitario: 39.00 },
      { sku: "ENCO-1002", cantidad: 1, precioUnitario: 63.38 },
      { sku: "BKVB-0032", cantidad: 2, precioUnitario: 7.06 },
      { sku: "BKVB-0004", cantidad: 1, precioUnitario: 24.40 },
      { sku: "BKVB-0017", cantidad: 1, precioUnitario: 28.02 },
    ],
  },

  // 3. Factura 2000016767 ($862.88)
  {
    numeroFactura: "2000016767",
    fechaCompra: "2025-11-06T12:00:00Z",
    total: 862.88,
    notas: "Pedido Cliente PCLI #: 0000004615. Condición: CREDITO 30 DIAS. Vencimiento: 06/12/2025. Dirección de Entrega: CALLE 148 CASA NRO 52A BARRIO SUR AMERICA SUR AMERICA ZULIA ZONA POSTAL 4004. Vendedor: ALVARO LUIS SALAZAR RAMOS. Usuario: ASISTENTE ADMINSTRATIVO.",
    items: [
      { sku: "ENRG-0004", cantidad: 1, precioUnitario: 30.25 },
      { sku: "ENRG-0011", cantidad: 1, precioUnitario: 39.93 },
      { sku: "ENST-1009", cantidad: 2, precioUnitario: 18.80 },
      { sku: "ENWP-0007", cantidad: 1, precioUnitario: 30.67 },
      { sku: "ENDP-0004", cantidad: 2, precioUnitario: 22.78 },
      { sku: "ENDP-0002", cantidad: 2, precioUnitario: 26.57 },
      { sku: "DTCL-0002", cantidad: 2, precioUnitario: 11.98 },
      { sku: "ENHG-0011", cantidad: 1, precioUnitario: 26.00 },
      { sku: "ENHG-0028", cantidad: 1, precioUnitario: 19.84 },
      { sku: "ENHG-6001", cantidad: 1, precioUnitario: 5.67 },
      { sku: "ENHG-6002", cantidad: 1, precioUnitario: 10.17 },
      { sku: "ENHG-6003", cantidad: 1, precioUnitario: 10.17 },
      { sku: "ENHG-8002", cantidad: 1, precioUnitario: 4.77 },
      { sku: "ENHG-8003", cantidad: 1, precioUnitario: 6.93 },
      { sku: "ENHG-4003", cantidad: 2, precioUnitario: 9.00 },
      { sku: "ENHG-4013", cantidad: 1, precioUnitario: 12.09 },
      { sku: "ENHG-4010", cantidad: 1, precioUnitario: 3.87 },
      { sku: "ENOC-0003", cantidad: 2, precioUnitario: 6.00 },
      { sku: "ENOC-0002", cantidad: 1, precioUnitario: 12.03 },
      { sku: "ENOC-0015", cantidad: 2, precioUnitario: 7.67 },
      { sku: "ENOC-0004", cantidad: 2, precioUnitario: 6.00 },
      { sku: "ENOC-0001", cantidad: 1, precioUnitario: 12.03 },
      { sku: "ENOC-0005", cantidad: 2, precioUnitario: 6.00 },
      { sku: "ENOC-1013", cantidad: 2, precioUnitario: 2.67 },
      { sku: "ENOC-1020", cantidad: 2, precioUnitario: 4.43 },
      { sku: "ENOC-1014", cantidad: 2, precioUnitario: 2.45 },
      { sku: "ENOC-1010", cantidad: 2, precioUnitario: 11.18 },
      { sku: "ENOC-1015", cantidad: 2, precioUnitario: 8.84 },
      { sku: "ENOC-1023", cantidad: 2, precioUnitario: 8.80 },
      { sku: "ENOC-1019", cantidad: 2, precioUnitario: 13.33 },
      { sku: "ENOC-1004", cantidad: 2, precioUnitario: 13.58 },
      { sku: "ACGO-0010", cantidad: 1, precioUnitario: 40.64 },
      { sku: "WHBG-0002", cantidad: 2, precioUnitario: 5.66 },
      { sku: "WHBG-0004", cantidad: 2, precioUnitario: 5.51 },
      { sku: "WHBG-0003", cantidad: 2, precioUnitario: 9.72 },
      { sku: "WHBG-0034", cantidad: 2, precioUnitario: 5.83 },
      { sku: "WHBG-0006", cantidad: 2, precioUnitario: 10.87 },
      { sku: "WHBG-0010", cantidad: 2, precioUnitario: 8.84 },
      { sku: "WHBG-0035", cantidad: 2, precioUnitario: 11.10 },
      { sku: "WHBG-0011", cantidad: 2, precioUnitario: 9.52 },
      { sku: "WHBG-0037", cantidad: 2, precioUnitario: 13.66 },
      { sku: "WHBG-0007", cantidad: 2, precioUnitario: 14.00 },
      { sku: "WHBG-1001", cantidad: 2, precioUnitario: 4.00 },
      { sku: "ENSD-0002", cantidad: 2, precioUnitario: 10.06 },
      { sku: "ENSD-0004", cantidad: 2, precioUnitario: 10.06 },
    ],
  },

  // 4. Factura 2000016768 ($879.27)
  {
    numeroFactura: "2000016768",
    fechaCompra: "2025-11-06T12:00:00Z",
    total: 879.27,
    notas: "Pedido Cliente PCLI #: 0000004614. Condición: CREDITO 30 DIAS. Vencimiento: 06/12/2025. Dirección de Entrega: CALLE 148 CASA NRO 52A BARRIO SUR AMERICA SUR AMERICA ZULIA ZONA POSTAL 4004. Vendedor: ALVARO LUIS SALAZAR RAMOS. Usuario: ASISTENTE ADMINSTRATIVO.",
    items: [
      { sku: "ENFB-0001", cantidad: 1, precioUnitario: 23.83 },
      { sku: "ENFB-0009", cantidad: 1, precioUnitario: 19.18 },
      { sku: "ENFR-0013", cantidad: 2, precioUnitario: 8.47 },
      { sku: "ENFR-0015", cantidad: 2, precioUnitario: 17.33 },
      { sku: "ENDP-0012", cantidad: 1, precioUnitario: 31.28 },
      { sku: "DTCL-0003", cantidad: 1, precioUnitario: 29.90 },
      { sku: "DTCL-0004", cantidad: 1, precioUnitario: 22.75 },
      { sku: "DTCL-0005", cantidad: 2, precioUnitario: 14.30 },
      { sku: "DTCL-0007", cantidad: 1, precioUnitario: 10.73 },
      { sku: "DTCU-0017", cantidad: 1, precioUnitario: 21.23 },
      { sku: "DTCU-0001", cantidad: 3, precioUnitario: 16.89 },
      { sku: "DTCU-0009", cantidad: 1, precioUnitario: 15.60 },
      { sku: "DTCU-0004", cantidad: 1, precioUnitario: 16.90 },
      { sku: "DTCU-0005", cantidad: 1, precioUnitario: 18.20 },
      { sku: "DTCU-0006", cantidad: 1, precioUnitario: 18.53 },
      { sku: "ACBA-0010", cantidad: 1, precioUnitario: 19.07 },
      { sku: "ENBT-0014", cantidad: 2, precioUnitario: 9.39 },
      { sku: "ENBT-0016", cantidad: 2, precioUnitario: 11.79 },
      { sku: "ENBT-0028", cantidad: 1, precioUnitario: 5.86 },
      { sku: "ENBT-0029", cantidad: 1, precioUnitario: 5.86 },
      { sku: "ENBT-0032", cantidad: 1, precioUnitario: 4.02 },
      { sku: "ENBT-0031", cantidad: 1, precioUnitario: 9.39 },
      { sku: "DTUJ-0003", cantidad: 3, precioUnitario: 5.66 },
      { sku: "ENHG-0004", cantidad: 1, precioUnitario: 10.46 },
      { sku: "ENFC-0014", cantidad: 1, precioUnitario: 43.33 },
      { sku: "ENAF-1015", cantidad: 1, precioUnitario: 13.76 },
      { sku: "ENAF-1001", cantidad: 1, precioUnitario: 13.75 },
      { sku: "ENAF-1013", cantidad: 2, precioUnitario: 19.50 },
      { sku: "DTDP-0004", cantidad: 2, precioUnitario: 25.00 },
      { sku: "DTBC-1002", cantidad: 1, precioUnitario: 21.67 },
      { sku: "DTCB-0003", cantidad: 2, precioUnitario: 21.32 },
      { sku: "ACGO-0001", cantidad: 1, precioUnitario: 20.17 },
      { sku: "DTSV-0003", cantidad: 1, precioUnitario: 44.00 },
      { sku: "ENET-0010", cantidad: 2, precioUnitario: 16.47 },
      { sku: "ACTP-0003", cantidad: 4, precioUnitario: 3.12 },
      { sku: "ACTP-0001", cantidad: 2, precioUnitario: 15.00 },
      { sku: "ACTP-0002", cantidad: 2, precioUnitario: 9.88 },
      { sku: "DTCC-1001", cantidad: 4, precioUnitario: 2.66 },
      { sku: "BKVB-0006", cantidad: 1, precioUnitario: 12.13 },
    ],
  },

  // 5. Factura 2000016368 ($44.12)
  {
    numeroFactura: "2000016368",
    fechaCompra: "2025-10-08T12:00:00Z",
    total: 44.12,
    notas: "Condición: CREDITO 30 DIAS. Vencimiento: 07/11/2025. Dirección de Entrega: CALLE 148 CASA NRO 52A BARRIO SUR AMERICA SUR AMERICA ZULIA ZONA POSTAL 4004. Vendedor: ALVARO LUIS SALAZAR RAMOS. Usuario: ASISTENTE ADMINSTRATIVO.",
    items: [
      { sku: "DTCU-0002", cantidad: 2, precioUnitario: 22.06 },
    ],
  },

  // 6. Factura 2000018292 ($589.79)
  {
    numeroFactura: "2000018292",
    fechaCompra: "2026-03-05T12:00:00Z",
    total: 589.79,
    notas: "Pedido Cliente PCLI #: 0000006682. Condición: CREDITO 30 DIAS. Vencimiento: 04/04/2026. Dirección de Entrega: CALLE 148 CASA NRO 52A BARRIO SUR AMERICA SUR AMERICA ZULIA ZONA POSTAL 4004. Vendedor: ALVARO LUIS SALAZAR RAMOS. Usuario: ASISTENTE ADMINSTRATIVO.",
    items: [
      { sku: "ENWP-0001", cantidad: 1, precioUnitario: 40.01 },
      { sku: "ENDP-0003", cantidad: 4, precioUnitario: 7.37 },
      { sku: "ENBT-0017", cantidad: 1, precioUnitario: 11.61 },
      { sku: "ENBT-0022", cantidad: 2, precioUnitario: 5.03 },
      { sku: "ENBT-0023", cantidad: 2, precioUnitario: 4.02 },
      { sku: "ENBT-0024", cantidad: 2, precioUnitario: 5.37 },
      { sku: "ENBT-0026", cantidad: 2, precioUnitario: 5.52 },
      { sku: "ENBT-0027", cantidad: 2, precioUnitario: 5.75 },
      { sku: "ENOC-1013", cantidad: 2, precioUnitario: 2.67 },
      { sku: "ENOC-1014", cantidad: 2, precioUnitario: 2.45 },
      { sku: "ENOC-1015", cantidad: 2, precioUnitario: 8.84 },
      { sku: "ENOC-1023", cantidad: 2, precioUnitario: 8.80 },
      { sku: "LGLS-4018", cantidad: 2, precioUnitario: 19.74 },
      { sku: "LGLS-4022", cantidad: 2, precioUnitario: 19.74 },
      { sku: "ENAF-0007", cantidad: 1, precioUnitario: 13.00 },
      { sku: "ENAF-1012", cantidad: 2, precioUnitario: 45.93 },
      { sku: "ENAF-1022", cantidad: 1, precioUnitario: 82.81 },
      { sku: "WHBG-0010", cantidad: 2, precioUnitario: 8.84 },
      { sku: "WHBG-0011", cantidad: 2, precioUnitario: 9.52 },
      { sku: "ENSD-0002", cantidad: 2, precioUnitario: 10.06 },
      { sku: "ENCO-1003", cantidad: 1, precioUnitario: 39.00 },
      { sku: "DTTN-0004", cantidad: 2, precioUnitario: 12.33 },
      { sku: "DTTN-0002", cantidad: 2, precioUnitario: 12.33 },
    ],
  },

  // 7. Factura 2000018293 ($591.56)
  {
    numeroFactura: "2000018293",
    fechaCompra: "2026-03-05T12:00:00Z",
    total: 591.56,
    notas: "Pedido Cliente PCLI #: 0000006681. Condición: CREDITO 30 DIAS. Vencimiento: 04/04/2026. Dirección de Entrega: CALLE 148 CASA NRO 52A BARRIO SUR AMERICA SUR AMERICA ZULIA ZONA POSTAL 4004. Vendedor: ALVARO LUIS SALAZAR RAMOS. Usuario: ASISTENTE ADMINSTRATIVO.",
    items: [
      { sku: "BKBP-0001", cantidad: 1, precioUnitario: 45.93 },
      { sku: "BKBP-0007", cantidad: 1, precioUnitario: 47.94 },
      { sku: "BKBP-0010", cantidad: 1, precioUnitario: 30.55 },
      { sku: "DTCL-0012", cantidad: 1, precioUnitario: 12.83 },
      { sku: "DTCL-0002", cantidad: 2, precioUnitario: 11.98 },
      { sku: "DTCL-0010", cantidad: 1, precioUnitario: 18.37 },
      { sku: "DTCU-0015", cantidad: 1, precioUnitario: 20.99 },
      { sku: "DTCU-0012", cantidad: 2, precioUnitario: 17.23 },
      { sku: "DTCU-0009", cantidad: 1, precioUnitario: 15.60 },
      { sku: "BKEP-0001", cantidad: 1, precioUnitario: 6.93 },
      { sku: "BKEP-0002", cantidad: 1, precioUnitario: 6.59 },
      { sku: "DTCC-0012", cantidad: 1, precioUnitario: 13.78 },
      { sku: "DTCC-0001", cantidad: 1, precioUnitario: 17.02 },
      { sku: "DTCC-0002", cantidad: 1, precioUnitario: 22.22 },
      { sku: "DTBC-0007", cantidad: 1, precioUnitario: 76.20 },
      { sku: "BWTD-0025", cantidad: 1, precioUnitario: 27.66 },
      { sku: "ACGO-0001", cantidad: 1, precioUnitario: 20.17 },
      { sku: "ACGO-0002", cantidad: 1, precioUnitario: 23.77 },
      { sku: "ACTP-0004", cantidad: 2, precioUnitario: 3.25 },
      { sku: "ACTP-0005", cantidad: 2, precioUnitario: 3.12 },
      { sku: "ACTP-0001", cantidad: 2, precioUnitario: 15.00 },
      { sku: "BKVB-0001", cantidad: 1, precioUnitario: 18.30 },
      { sku: "BKVB-0032", cantidad: 2, precioUnitario: 6.41 },
      { sku: "BKVB-0020", cantidad: 1, precioUnitario: 17.33 },
      { sku: "BKVB-0006", cantidad: 1, precioUnitario: 11.20 },
      { sku: "BKVB-0025", cantidad: 2, precioUnitario: 12.10 },
    ],
  },
];

async function main() {
  console.log("Fetching client VENE-TRUCK, C.A...");
  const clientRows = await sql`SELECT id FROM clientes WHERE nombre = 'VENE-TRUCK, C.A' OR rif ILIKE '%50171570%'`;
  if (clientRows.length === 0) {
    throw new Error("Client VENE-TRUCK, C.A not found in database");
  }
  const clienteId = clientRows[0].id;
  console.log("Client found with ID:", clienteId);

  // Collect all unique SKUs
  const allSkus = Array.from(new Set(invoices.flatMap((inv) => inv.items.map((it) => it.sku))));
  console.log(`Checking ${allSkus.length} unique SKUs in database...`);

  const prodRows = await sql`
    SELECT id, codigo_sku, precio, stock_actual 
    FROM productos 
    WHERE codigo_sku = ANY(${allSkus})
  `;
  const prodMap = new Map(prodRows.map((r) => [r.codigo_sku, r]));

  const missing = allSkus.filter((sku) => !prodMap.has(sku));
  if (missing.length > 0) {
    console.error("Missing SKUs in productos table:", missing);
    process.exit(1);
  }
  console.log("All SKUs exist in database!");

  // Process each invoice
  let totalInvoicesCreated = 0;
  let totalItemsCreated = 0;

  for (const inv of invoices) {
    console.log(`\nProcessing invoice ${inv.numeroFactura} (Total: $${inv.total})...`);
    
    // Check if already exists
    const existing = await sql`SELECT id FROM compras WHERE numero_factura = ${inv.numeroFactura}`;
    if (existing.length > 0) {
      console.log(`Invoice ${inv.numeroFactura} already exists, skipping.`);
      continue;
    }

    // Insert purchase
    const [compraRow] = await sql`
      INSERT INTO compras (
        cliente_id, numero_factura, fecha_compra, total, estado, metodo_pago, notas
      ) VALUES (
        ${clienteId}, ${inv.numeroFactura}, ${inv.fechaCompra}, ${inv.total.toFixed(2)}, 'completada', 'credito', ${inv.notas}
      )
      RETURNING id
    `;
    const compraId = compraRow.id;
    console.log(`Invoice created with ID: ${compraId}`);

    // Insert items
    for (const it of inv.items) {
      const prod = prodMap.get(it.sku)!;
      const subtotal = (it.cantidad * it.precioUnitario).toFixed(2);
      await sql`
        INSERT INTO detalles_compra (
          compra_id, producto_id, cantidad, precio_unitario, subtotal
        ) VALUES (
          ${compraId}, ${prod.id}, ${it.cantidad}, ${it.precioUnitario.toFixed(2)}, ${subtotal}
        )
      `;

      // Update stock
      await sql`
        UPDATE productos 
        SET stock_actual = stock_actual - ${it.cantidad}
        WHERE id = ${prod.id}
      `;
      totalItemsCreated++;
    }

    totalInvoicesCreated++;
    console.log(`Invoice ${inv.numeroFactura} inserted with ${inv.items.length} items.`);
  }

  // Update client notes with updated history summary
  const summaryNotes = `Cliente mayorista ubicado en Calle 148 Casa Nro 52A, Barrio Sur América, Zulia (Zona Postal 4004). Teléfono: 0424-6152098. Especializado en repuestos y mantenimiento para flotas de carga pesada y mediana (Cummins 4BT/6BT/6CT, Iveco Daily/Tector/Stralis, Isuzu NPR/NKR/NHR/FVR, Ford Cargo 815/1721, Mitsubishi Canter/Fuso, JAC Gallop y Toyota Dyna). Historial activo de compras a crédito 30 días con facturación consolidada en partes de motor, embrague, frenos, filtración, rodamientos y estoperas. Condición comercial: Crédito 30 días. Vendedor asignado: Álvaro Luis Salazar Ramos.`;
  await sql`
    UPDATE clientes 
    SET notas = ${summaryNotes}, limite_credito = '6000.00'
    WHERE id = ${clienteId}
  `;

  console.log(`\n=== Batch completed successfully! ===`);
  console.log(`Invoices created: ${totalInvoicesCreated}`);
  console.log(`Line items created: ${totalItemsCreated}`);
}

main().catch((err) => {
  console.error("Error executing batch:", err);
  process.exit(1);
});
