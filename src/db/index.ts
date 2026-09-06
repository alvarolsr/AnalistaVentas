import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const isNeonConfigured = Boolean(connectionString && !connectionString.includes("sample-123456"));

export function getDb() {
  if (!isNeonConfigured || !connectionString) {
    return null;
  }
  const client = neon(connectionString);
  return drizzle(client, { schema });
}
