import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./configs/schema.js",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL
  },
  verbose: true,
  strict: true,
});
