import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./configs/schema.js",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.NEXT_PUBLIC_DB_CONNECTION_STRING
  },
  verbose: true,
  strict: true,
});
