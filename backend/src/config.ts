// backend/src/config.ts
import * as dotenv from "dotenv";
import path from "path";

// Load .env (development). On Render/Vercel env vars are injected directly.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Warn about missing base infrastructure vars
const required = ["PORT", "DATABASE_PATH", "FRONTEND_ORIGIN"];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`Warning: environment variable ${key} is not set; using default values.`);
  }
}

export const CONFIG = {
  port:               Number(process.env.PORT) || 4000,
  databasePath:       path.resolve(process.cwd(), process.env.DATABASE_PATH || "dev.db"),
  frontendOrigin:     process.env.FRONTEND_ORIGIN as string,
  enableDemoIdentity: process.env.ENABLE_DEMO_IDENTITY === "true",

  // ── AI provider configuration ──────────────────────────────
  // Supported providers: "ollama" | "openai-compat"
  // Leave AI_PROVIDER empty to run without AI (model-unavailable state).
  ai: {
    provider:  (process.env.AI_PROVIDER  || "") as "ollama" | "openai-compat" | "",
    model:     process.env.AI_MODEL      || "llama3.2:3b",
    baseUrl:   process.env.AI_BASE_URL   || "http://localhost:11434",
    apiKey:    process.env.AI_API_KEY    || "",  // never sent to the browser
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 30000,
  },
};
