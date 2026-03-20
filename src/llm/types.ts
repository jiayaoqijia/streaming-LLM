export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  token: string;
  finishReason?: string;
}

export interface LLMProviderConfig {
  name: string;
  baseUrl: string;
  apiKeyEnvVar: string;
}
