import type { Env } from "../types";
import type { ChatMessage, StreamChunk } from "./types";
import { streamCompletion as streamOpenRouter } from "./openrouter";
import { streamCompletion as streamAltLLM } from "./altllm";

export function resolveProvider(model: string): "openrouter" | "altllm" {
  return model.startsWith("altllm-") ? "altllm" : "openrouter";
}

export async function* streamFromProvider(
  env: Env,
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<StreamChunk> {
  const provider = resolveProvider(model);
  if (provider === "altllm") {
    yield* streamAltLLM(env.ALTLLM_API_KEY, model, messages);
  } else {
    yield* streamOpenRouter(env.OPENROUTER_API_KEY, model, messages);
  }
}
