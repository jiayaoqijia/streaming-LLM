import { Mppx, tempo } from "mppx/server";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";

export function createMppx(privateKey: string) {
  const account = privateKeyToAccount(privateKey as Hex);
  return Mppx.create({
    methods: [
      tempo({
        account,
        feePayer: true,
        currency: "0x20c0000000000000000000000000000000000000",
        sse: true,
      }),
    ],
    secretKey: "streaming-llm-secret",
    realm: "streaming-llm",
  });
}
