import { Hono } from "hono";
import type { Env, ChatRequest } from "../types";
import { getModelInfo } from "../mpp/pricing";
import { streamFromProvider } from "../llm/provider";
import { createMppx } from "../mpp/server";

const chat = new Hono<{ Bindings: Env }>();

function formatAmount(price: number): string {
  return price.toFixed(20).replace(/0+$/, "").replace(/\.$/, ".0");
}

const DEFAULT_AMOUNT = formatAmount(0.0000008);

// Single shared mppx instance (persists in-memory for Node.js)
let sharedMppx: ReturnType<typeof createMppx> | null = null;

chat.post("/api/chat", async (c) => {
  const isDemoMode = c.env.DEMO_MODE === "true";

  if (isDemoMode) {
    const body = await c.req.json<ChatRequest>();
    if (!body.messages?.length) return c.json({ error: "messages required", code: "INVALID_REQUEST" }, 400);
    if (!body.model) return c.json({ error: "model required", code: "INVALID_REQUEST" }, 400);
    const modelInfo = getModelInfo(body.model);
    if (!modelInfo) return c.json({ error: "unknown model", code: "UNKNOWN_MODEL" }, 400);

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
  }

  // MPP mode: pass the raw request directly to mppx session handler
  // Do NOT consume the body first — mppx needs the full request
  if (!sharedMppx) {
    sharedMppx = createMppx(c.env.TEMPO_PRIVATE_KEY, c.env.MPP_STORE);
  }

  const result = await sharedMppx.session({
    amount: DEFAULT_AMOUNT,
    unitType: "token",
  })(c.req.raw);

  if (result.status === 402) {
    return result.challenge;
  }

  // Parse body AFTER mppx verification succeeds
  // For voucher POSTs, withReceipt() with no args handles it
  let body: ChatRequest | null = null;
  try {
    body = await c.req.json<ChatRequest>();
  } catch {
    // voucher/management POST — no body
    return result.withReceipt();
  }

  if (!body?.messages?.length || !body?.model) {
    return result.withReceipt(new Response("Bad request", { status: 400 }));
  }

  const modelInfo = getModelInfo(body.model);
  if (!modelInfo) {
    return result.withReceipt(new Response("Unknown model", { status: 400 }));
  }

  return result.withReceipt(async function* (paymentStream) {
    let tokenCount = 0;
    for await (const chunk of streamFromProvider(c.env, body!.model, body!.messages)) {
      await paymentStream.charge();
      tokenCount++;
      const cost = tokenCount * modelInfo.outputPricePerToken;
      yield `data: ${JSON.stringify({ token: chunk.token, cost })}\n\n`;
    }
    yield "data: [DONE]\n\n";
  });
});

export default chat;
