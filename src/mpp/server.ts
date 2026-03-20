import { Mppx, tempo } from "mppx/server";

export function createMppx(privateKey: string) {
  return Mppx.create({
    methods: [
      tempo({
        privateKey,
        testnet: true,
        currency: "0x20c0000000000000000000000000000000000000",
        sse: { poll: true },
      }),
    ],
    secretKey: privateKey,
  });
}
