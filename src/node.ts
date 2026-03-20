import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import health from "./routes/health";
import modelsRoute from "./routes/models";
import chat from "./routes/chat";

const app = new Hono<{ Bindings: Env }>();

// Inject env vars from process.env into Hono context
app.use("*", async (c, next) => {
  c.env = {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? "",
    ALTLLM_API_KEY: process.env.ALTLLM_API_KEY ?? "",
    TEMPO_PRIVATE_KEY: process.env.TEMPO_PRIVATE_KEY ?? "",
    DEMO_MODE: process.env.DEMO_MODE,
  } as Env;
  await next();
});

app.use("/api/*", cors());

app.route("/", health);
app.route("/", modelsRoute);
app.route("/", chat);

// Serve static files from web/ directory
app.use("/*", serveStatic({ root: "./web" }));

const port = Number(process.env.PORT) || 8787;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`streaming-llm listening on http://localhost:${info.port}`);
});
