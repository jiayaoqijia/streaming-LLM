import { Hono } from "hono";
import type { Env, ChatRequest } from "../types";
import { getModelInfo } from "../mpp/pricing";
import { streamFromProvider } from "../llm/provider";
import { createMppx } from "../mpp/server";

const chat = new Hono<{ Bindings: Env }>();

let cachedMppx: ReturnType<typeof createMppx> | null = null;
let cachedKey: string | null = null;

function getMppx(privateKey: string) {
  if (cachedMppx && cachedKey === privateKey) return cachedMppx;
  cachedMppx = createMppx(privateKey);
  cachedKey = privateKey;
  return cachedMppx;
}

function formatAmount(price: number): string {
  return price.toFixed(20).replace(/0+$/, "").replace(/\.$/, ".0");
}

// Default amount for the 402 challenge (cheapest model).
// The HMAC is recomputed from these options, so it must match.
const DEFAULT_AMOUNT = formatAmount(0.0000008);

chat.post("/api/chat", async (c) => {
  const isDemoMode = c.env.DEMO_MODE === "true";

  if (!isDemoMode) {
    const mppx = getMppx(c.env.TEMPO_PRIVATE_KEY);

    // Clone the request so mppx gets an unconsumed body
    const forMppx = c.req.raw.clone();

    // Parse body to get model info (consumes c.req.raw body)
    let body: ChatRequest;
    try {
      body = await c.req.json<ChatRequest>();
    } catch {
      // Voucher/close POSTs have no JSON body
      const session = mppx.session({ amount: DEFAULT_AMOUNT, unitType: "token" });
      const result = await session(c.req.raw);
      if (result.status === 402) return result.challenge;
      return result.withReceipt(new Response("OK"));
    }

    if (!body.messages?.length) {
      return c.json({ error: "messages required", code: "INVALID_REQUEST" }, 400);
    }
    if (!body.model) {
      return c.json({ error: "model required", code: "INVALID_REQUEST" }, 400);
    }

    const modelInfo = getModelInfo(body.model);
    if (!modelInfo) {
      return c.json({ error: "unknown model", code: "UNKNOWN_MODEL" }, 400);
    }

    const amount = formatAmount(modelInfo.outputPricePerToken);
    console.log("[chat] amount:", amount, "hasAuth:", !!c.req.header("Authorization"));
    const session = mppx.session({ amount, unitType: "token" });

    // Pass the cloned request (with unconsumed body) to mppx
    const result = await session(forMppx);
    console.log("[chat] session result status:", result.status);

    if (result.status === 402) {
      return result.challenge;
    }

    console.log("[chat] withReceipt: starting stream for model", body.model);
    return result.withReceipt(async function* (paymentStream) {
      let tokenCount = 0;
      try {
        for await (const chunk of streamFromProvider(c.env, body.model, body.messages)) {
          await paymentStream.charge();
          tokenCount++;
          const cost = tokenCount * modelInfo.outputPricePerToken;
          console.log("[chat] token", tokenCount, ":", chunk.token?.slice(0, 20));
          yield `data: ${JSON.stringify({ token: chunk.token, cost })}\n\n`;
        }
      } catch (err: unknown) {
        console.error("[chat] stream error:", err instanceof Error ? err.message : err);
      }
      console.log("[chat] stream complete, tokens:", tokenCount);
      yield "data: [DONE]\n\n";
    });
  }

  // DEMO_MODE flow
  const body = await c.req.json<ChatRequest>();

  if (!body.messages?.length) {
    return c.json({ error: "messages required", code: "INVALID_REQUEST" }, 400);
  }
  if (!body.model) {
    return c.json({ error: "model required", code: "INVALID_REQUEST" }, 400);
  }

  const modelInfo = getModelInfo(body.model);
  if (!modelInfo) {
    return c.json({ error: "unknown model", code: "UNKNOWN_MODEL" }, 400);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let tokenCount = 0;
      try {
        for await (const chunk of streamFromProvider(c.env, body.model, body.messages)) {
          tokenCount++;
          const cost = tokenCount * modelInfo.outputPricePerToken;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk.token, cost })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
});

export default chat;
