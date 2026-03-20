import { Hono } from "hono";
import type { Env, ChatRequest } from "../types";
import { getModelInfo } from "../mpp/pricing";
import { streamFromProvider } from "../llm/provider";
import { createMppx } from "../mpp/server";

const chat = new Hono<{ Bindings: Env }>();

chat.post("/api/chat", async (c) => {
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

  const isDemoMode = c.env.DEMO_MODE === "true";

  if (isDemoMode) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let tokenCount = 0;
        try {
          for await (const chunk of streamFromProvider(
            c.env,
            body.model,
            body.messages
          )) {
            tokenCount++;
            const cost = tokenCount * modelInfo.outputPricePerToken;
            const event = `data: ${JSON.stringify({ token: chunk.token, cost })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "stream error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const mppx = createMppx(c.env.TEMPO_PRIVATE_KEY);
  const session = mppx.session({
    amount: String(modelInfo.outputPricePerToken),
    unitType: "token",
  });

  const result = await session(c.req.raw);

  if (result.status === 402) {
    return result.challenge;
  }

  return result.withReceipt(async function* (paymentStream) {
    let tokenCount = 0;
    for await (const chunk of streamFromProvider(
      c.env,
      body.model,
      body.messages
    )) {
      await paymentStream.charge();
      tokenCount++;
      const cost = tokenCount * modelInfo.outputPricePerToken;
      yield `data: ${JSON.stringify({ token: chunk.token, cost })}\n\n`;
    }
    yield "data: [DONE]\n\n";
  });
});

export default chat;
