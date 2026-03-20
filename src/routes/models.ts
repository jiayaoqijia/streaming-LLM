import { Hono } from "hono";
import type { Env } from "../types";
import { models } from "../mpp/pricing";

const modelsRoute = new Hono<{ Bindings: Env }>();

modelsRoute.get("/api/models", (c) => {
  const grouped = {
    openrouter: models.filter((m) => m.provider === "openrouter"),
    altllm: models.filter((m) => m.provider === "altllm"),
  };
  return c.json(grouped);
});

export default modelsRoute;
