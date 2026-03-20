import type { ChatMessage, StreamChunk } from "./types";

const BASE_URL = "https://api.altllm.ai/v1/chat/completions";

export async function* streamCompletion(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): AsyncGenerator<StreamChunk> {
  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AltLLM API error ${response.status}: ${text}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body from AltLLM");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;

        if (!trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);

        if (payload === "[DONE]") return;

        const parsed: unknown = JSON.parse(payload);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "choices" in parsed
        ) {
          const choices = (parsed as Record<string, unknown>)["choices"];
          if (Array.isArray(choices) && choices.length > 0) {
            const choice = choices[0] as Record<string, unknown>;
            const delta = choice["delta"] as
              | Record<string, unknown>
              | undefined;
            const content = delta?.["content"];
            const finishReason = choice["finish_reason"];

            if (typeof content === "string" && content.length > 0) {
              yield {
                token: content,
                finishReason:
                  typeof finishReason === "string" ? finishReason : undefined,
              };
            } else if (typeof finishReason === "string") {
              yield { token: "", finishReason };
            }
          }
        }
      }
    }

    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data: ")) {
        const payload = trimmed.slice(6);
        if (payload !== "[DONE]") {
          const parsed: unknown = JSON.parse(payload);
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "choices" in parsed
          ) {
            const choices = (parsed as Record<string, unknown>)["choices"];
            if (Array.isArray(choices) && choices.length > 0) {
              const choice = choices[0] as Record<string, unknown>;
              const delta = choice["delta"] as
                | Record<string, unknown>
                | undefined;
              const content = delta?.["content"];
              if (typeof content === "string" && content.length > 0) {
                yield { token: content };
              }
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
