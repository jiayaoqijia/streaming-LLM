import { Mppx, tempo } from "mppx/server";
import { Store } from "mppx";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

export function createMppx(privateKey: string, kv?: KVNamespace) {
  const account = privateKeyToAccount(privateKey as Hex);
  const store = kv ? Store.cloudflare(kv) : Store.memory();
  return Mppx.create({
    methods: [
      tempo({
        account,
        feePayer: true,
        currency: "0x20c0000000000000000000000000000000000000",
        store,
        sse: { poll: true },
      }),
    ],
    secretKey: "streaming-llm-secret",
    realm: "streaming-llm",
  });
}
