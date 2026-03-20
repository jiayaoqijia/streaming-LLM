import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import health from "./routes/health";
import modelsRoute from "./routes/models";
import chat from "./routes/chat";

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());

app.route("/", health);
app.route("/", modelsRoute);
app.route("/", chat);

export default app;
