import Credentials from "next-auth/providers/credentials";
import { authenticateTonWallet } from "@/modules/auth/application/authenticate-ton-wallet.use-case";

export const tonConnectProvider = Credentials({
  id: "ton-connect",
  name: "TON Wallet",
  credentials: {
    proofRequest: { label: "Proof", type: "text" },
  },
  async authorize(credentials) {
    if (!credentials?.proofRequest || typeof credentials.proofRequest !== "string") {
      return null;
    }

    return authenticateTonWallet(credentials.proofRequest);
  },
});
