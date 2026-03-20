export interface ModelInfo {
  id: string;
  name: string;
  provider: "openrouter" | "altllm";
  inputPricePerToken: number;
  outputPricePerToken: number;
}

export const models: ModelInfo[] = [
  // --- OpenRouter models (pricing as of March 2026) ---

  // Flagship models
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus 4.6",
    provider: "openrouter",
    inputPricePerToken: 0.000005,
    outputPricePerToken: 0.000025,
  },
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    provider: "openrouter",
    inputPricePerToken: 0.0000025,
    outputPricePerToken: 0.000015,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "openrouter",
    inputPricePerToken: 0.00000125,
    outputPricePerToken: 0.00001,
  },
  {
    id: "z-ai/glm-5",
    name: "GLM-5",
    provider: "openrouter",
    inputPricePerToken: 0.00000072,
    outputPricePerToken: 0.0000023,
  },

  // Mid-tier models
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "openrouter",
    inputPricePerToken: 0.000003,
    outputPricePerToken: 0.000015,
  },
  {
    id: "anthropic/claude-haiku-4.5",
    name: "Claude Haiku 4.5",
    provider: "openrouter",
    inputPricePerToken: 0.000001,
    outputPricePerToken: 0.000005,
  },
  {
    id: "openai/gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "openrouter",
    inputPricePerToken: 0.00000075,
    outputPricePerToken: 0.0000045,
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "openrouter",
    inputPricePerToken: 0.0000003,
    outputPricePerToken: 0.0000025,
  },
  {
    id: "minimax/minimax-m2.7",
    name: "MiniMax M2.7",
    provider: "openrouter",
    inputPricePerToken: 0.0000003,
    outputPricePerToken: 0.0000012,
  },

  // Budget / open-source models
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "openrouter",
    inputPricePerToken: 0.00000015,
    outputPricePerToken: 0.0000006,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "openrouter",
    inputPricePerToken: 0.0000007,
    outputPricePerToken: 0.0000025,
  },

  // --- AltLLM models ---
  {
    id: "altllm-standard",
    name: "AltLLM Standard",
    provider: "altllm",
    inputPricePerToken: 0.0000006,
    outputPricePerToken: 0.0000024,
  },
  {
    id: "altllm-basic",
    name: "AltLLM Basic",
    provider: "altllm",
    inputPricePerToken: 0.0000035,
    outputPricePerToken: 0.000028,
  },
  {
    id: "altllm-mega",
    name: "AltLLM Mega",
    provider: "altllm",
    inputPricePerToken: 0.00003,
    outputPricePerToken: 0.00015,
  },
];

export function getModelInfo(modelId: string): ModelInfo | undefined {
  return models.find((m) => m.id === modelId);
}
