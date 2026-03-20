import { test, expect } from "@playwright/test";

test.describe("Models endpoint", () => {
  test("GET /api/models returns models grouped by provider", async ({ request }) => {
    const res = await request.get("/api/models");
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.openrouter).toBeDefined();
    expect(body.altllm).toBeDefined();
    expect(Array.isArray(body.openrouter)).toBe(true);
    expect(Array.isArray(body.altllm)).toBe(true);
    expect(body.openrouter.length).toBeGreaterThan(0);
    expect(body.altllm.length).toBeGreaterThan(0);
  });

  test("each model has required fields", async ({ request }) => {
    const res = await request.get("/api/models");
    const body = await res.json();
    const allModels = [...body.openrouter, ...body.altllm];

    for (const model of allModels) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(typeof model.outputPricePerToken).toBe("number");
      expect(typeof model.inputPricePerToken).toBe("number");
      expect(["openrouter", "altllm"]).toContain(model.provider);
    }
  });
});
