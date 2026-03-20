export interface Env {
  OPENROUTER_API_KEY: string;
  ALTLLM_API_KEY: string;
  TEMPO_PRIVATE_KEY: string;
  DEMO_MODE?: string;
  ASSETS: Fetcher;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model: string;
  provider?: "openrouter" | "altllm";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
}
