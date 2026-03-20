import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import { privateKeyToAccount } from "viem/accounts";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const clientEntry = require.resolve("mppx/client");
const distDir = resolve(dirname(clientEntry), "..");
const { sessionManager } = require(
  resolve(distDir, "tempo/client/SessionManager.js")
);

// Each test uses a separate client wallet to avoid channel collisions
const CLIENT_KEYS = {
  stream:    "0xfe0e236fe94dbbe76065f6e2ccef05c0c3f5c0766a529c83ba98cf958290f0aa",
  reuse:     "0x7442a01def7d5857d7cb6dc680eaa5fdc309e301345dbdbb8c17d4211f42a1db",
  cost:      "0xe639806d92fd2a31b3bf06832d3516c86c6c63fd200892180ba3d75dbb3991a6",
  pricing:   "0xa8335f5cc9c4c9a755bb2d5d81c7f0073372b398f50fcce61eb4efb0d452b356",
  receipt:   "0xafc086f82333d1a1c9e8ab51084ea885b059d3f2450d0e0a13d66067baee6ad8",
} as const;
const BASE_URL = "https://api-production-5bcc.up.railway.app";
const MODEL = "meta-llama/llama-4-maverick";

test.describe("MPP mainnet payment flow", () => {
  test.setTimeout(120_000);

  test("streams tokens with real Tempo payment channel", async () => {
    const account = privateKeyToAccount(CLIENT_KEYS.stream);

    const session = sessionManager({
      account,
      maxDeposit: "0.001",
      decimals: 6,
    });

    const body = JSON.stringify({
      messages: [{ role: "user", content: "Say hello in one sentence." }],
      model: MODEL,
    });

    const stream = await session.sse(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      onReceipt: (receipt: unknown) => {
        console.log("Payment receipt:", receipt);
      },
    });

    let tokenCount = 0;
    let lastCost = 0;
    let fullResponse = "";

    for await (const raw of stream) {
      const chunk = raw.startsWith("data: ") ? raw.slice(6).trim() : raw.trim();
      if (chunk === "[DONE]") break;
      if (!chunk) continue;

      try {
        const parsed = JSON.parse(chunk);
        if (parsed.token) {
          fullResponse += parsed.token;
          tokenCount++;
        }
        if (parsed.cost !== undefined) {
          expect(parsed.cost).toBeGreaterThanOrEqual(lastCost);
          lastCost = parsed.cost;
        }
      } catch {
        // skip unparseable
      }
    }

    console.log(`Tokens: ${tokenCount}, Cost: $${lastCost.toFixed(6)}`);
    console.log(`Response: ${fullResponse.slice(0, 200)}`);
    console.log(`Channel ID: ${session.channelId}`);
    console.log(`Cumulative: ${session.cumulative}`);

    expect(tokenCount).toBeGreaterThan(0);
    expect(lastCost).toBeGreaterThan(0);
    expect(fullResponse.length).toBeGreaterThan(0);

    const finalReceipt = await session.close();
    if (finalReceipt) {
      console.log("Channel closed, final receipt:", finalReceipt);
    }
  });

  test("402 challenge without payment credentials", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/chat`, {
      headers: { "Content-Type": "application/json" },
      data: {
        messages: [{ role: "user", content: "Hello" }],
        model: MODEL,
      },
    });

    expect(response.status()).toBe(402);

    const wwwAuth = response.headers()["www-authenticate"];
    expect(wwwAuth).toBeDefined();
    expect(wwwAuth).toContain("Payment");
    expect(wwwAuth).toContain("tempo");
    expect(wwwAuth).toContain("session");
  });

  test("reuses payment channel across multiple requests", async () => {
    const account = privateKeyToAccount(CLIENT_KEYS.reuse);

    const session = sessionManager({
      account,
      maxDeposit: "0.001",
      decimals: 6,
    });

    // First request
    const stream1 = await session.sse(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Say hi in one word." }],
        model: MODEL,
      }),
    });

    let tokenCount1 = 0;
    for await (const raw of stream1) {
      const chunk = raw.startsWith("data: ") ? raw.slice(6).trim() : raw.trim();
      if (chunk === "[DONE]") break;
      if (!chunk) continue;
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.token) tokenCount1++;
      } catch { /* skip */ }
    }

    const channelIdAfterFirst = session.channelId;
    expect(tokenCount1).toBeGreaterThan(0);
    expect(channelIdAfterFirst).toBeDefined();

    // Second request through the same session
    const stream2 = await session.sse(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Say bye in one word." }],
        model: MODEL,
      }),
    });

    let tokenCount2 = 0;
    for await (const raw of stream2) {
      const chunk = raw.startsWith("data: ") ? raw.slice(6).trim() : raw.trim();
      if (chunk === "[DONE]") break;
      if (!chunk) continue;
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.token) tokenCount2++;
      } catch { /* skip */ }
    }

    expect(tokenCount2).toBeGreaterThan(0);
    expect(session.channelId).toBe(channelIdAfterFirst);

    console.log(`Channel reused: ${channelIdAfterFirst}`);
    console.log(`Tokens: request1=${tokenCount1}, request2=${tokenCount2}`);

    await session.close();
  });

  test("cost increments monotonically during stream", async () => {
    const account = privateKeyToAccount(CLIENT_KEYS.cost);

    const session = sessionManager({
      account,
      maxDeposit: "0.001",
      decimals: 6,
    });

    const stream = await session.sse(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Say hello." }],
        model: MODEL,
      }),
    });

    const costs: number[] = [];

    for await (const raw of stream) {
      const chunk = raw.startsWith("data: ") ? raw.slice(6).trim() : raw.trim();
      if (chunk === "[DONE]") break;
      if (!chunk) continue;
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.cost !== undefined) costs.push(parsed.cost);
      } catch { /* skip */ }
      if (costs.length >= 20) break; // safety cap
    }

    expect(costs.length).toBeGreaterThan(0);

    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]).toBeGreaterThanOrEqual(costs[i - 1]);
    }

    const finalCost = costs[costs.length - 1];
    expect(finalCost).toBeGreaterThan(0);

    console.log(`Collected ${costs.length} cost values, final: $${finalCost.toFixed(8)}`);
    await session.close();
  });

  test("verifies correct per-token pricing in cost data", async () => {
    const account = privateKeyToAccount(CLIENT_KEYS.pricing);
    const OUTPUT_PRICE = 0.0000008;

    const session = sessionManager({
      account,
      maxDeposit: "0.001",
      decimals: 6,
    });

    const stream = await session.sse(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Say hello in one sentence." }],
        model: MODEL,
      }),
    });

    let tokenCount = 0;
    let lastCost = 0;

    for await (const raw of stream) {
      const chunk = raw.startsWith("data: ") ? raw.slice(6).trim() : raw.trim();
      if (chunk === "[DONE]") break;
      if (!chunk) continue;
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.token) tokenCount++;
        if (parsed.cost !== undefined) lastCost = parsed.cost;
      } catch { /* skip */ }
    }

    expect(tokenCount).toBeGreaterThan(0);
    expect(lastCost).toBeGreaterThan(0);

    // Verify cost is consistent with per-token pricing
    // The server charges per SSE chunk (including empty tokens), so
    // actual cost may exceed tokenCount * price. Verify cost is a
    // multiple of the per-token price within floating point tolerance.
    const unitsCharged = Math.round(lastCost / OUTPUT_PRICE);
    expect(unitsCharged).toBeGreaterThanOrEqual(tokenCount);
    expect(Math.abs(lastCost - unitsCharged * OUTPUT_PRICE)).toBeLessThan(OUTPUT_PRICE * 0.1);

    console.log(
      `Pricing: ${tokenCount} tokens, cost=$${lastCost.toFixed(8)}, ` +
        `units=${Math.round(lastCost / OUTPUT_PRICE)} @ $${OUTPUT_PRICE}/token`
    );
    await session.close();
  });

  test("payment receipt contains valid channel data", async () => {
    const account = privateKeyToAccount(CLIENT_KEYS.receipt);

    const session = sessionManager({
      account,
      maxDeposit: "0.001",
      decimals: 6,
    });

    let capturedReceipt: Record<string, unknown> | null = null;

    const stream = await session.sse(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Say one word." }],
        model: MODEL,
      }),
      onReceipt: (receipt: Record<string, unknown>) => {
        capturedReceipt = receipt;
        console.log("Captured receipt:", JSON.stringify(receipt));
      },
    });

    let tokenCount = 0;
    let done = false;
    for await (const raw of stream) {
      const chunk = raw.startsWith("data: ") ? raw.slice(6).trim() : raw.trim();
      if (chunk === "[DONE]") { done = true; continue; }
      if (!chunk) continue;
      if (done) continue; // keep consuming for receipt event
      try {
        const parsed = JSON.parse(chunk);
        if (parsed.token) tokenCount++;
      } catch { /* skip */ }
    }

    expect(tokenCount).toBeGreaterThan(0);
    expect(capturedReceipt).not.toBeNull();

    const receipt = capturedReceipt!;
    expect(receipt.method).toBe("tempo");
    expect(receipt.intent).toBe("session");
    expect(receipt.status).toBe("success");

    const channelId = receipt.channelId as string;
    expect(channelId).toBeDefined();
    expect(channelId.startsWith("0x")).toBe(true);

    console.log(`Receipt validated: method=${receipt.method}, channelId=${channelId}`);
    await session.close();
  });
});
