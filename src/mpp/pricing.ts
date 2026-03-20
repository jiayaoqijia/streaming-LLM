export interface ModelInfo {
  id: string;
  name: string;
  provider: "openrouter" | "altllm";
  inputPricePerToken: number;
  outputPricePerToken: number;
}

export const models: ModelInfo[] = [
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "openrouter",
    inputPricePerToken: 0.0000002,
    outputPricePerToken: 0.0000008,
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "openrouter",
    inputPricePerToken: 0.000003,
    outputPricePerToken: 0.000015,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "openrouter",
    inputPricePerToken: 0.0000025,
    outputPricePerToken: 0.000015,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "openrouter",
    inputPricePerToken: 0.0000005,
    outputPricePerToken: 0.000002,
  },
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
