import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./configs/schema.js",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.NEXT_PUBLIC_DB_CONNECTION_STRING || 'postgresql://neondb_owner:npg_d8Fgih1lWUqH@ep-cool-tree-a4ll1itd-pooler.us-east-1.aws.neon.tech/AI-Study-Material-Gen?sslmode=require'
  },
  verbose: true,
  strict: true,
});
