// Type shims for Cloudflare Workers types when building for Node.js
declare interface Fetcher {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

declare interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
