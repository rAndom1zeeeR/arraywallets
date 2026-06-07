import Credentials from "next-auth/providers/credentials";
import { authenticateTonWallet } from "@/modules/auth/application/authenticate-ton-wallet.use-case";
import {
  TON_CREDENTIALS_PROVIDER_ID,
} from "@/modules/auth/domain/ton-connect.constants";
import type { TonProofSignature } from "@/modules/auth/infrastructure/ton-proof/ton-proof.schema";

export const tonConnectProvider = Credentials({
  id: TON_CREDENTIALS_PROVIDER_ID,
  name: "ArrayWallets",
  credentials: {
    address: { label: "Address", type: "text" },
    proof: { label: "Proof", type: "text" },
    public_key: { label: "Public key", type: "text" },
    wallet_state_init: { label: "Wallet state init", type: "text" },
    network: { label: "Network", type: "text" },
  },
  async authorize(credentials) {
    if (
      !credentials?.address ||
      typeof credentials.address !== "string" ||
      !credentials.proof ||
      typeof credentials.proof !== "string" ||
      !credentials.public_key ||
      typeof credentials.public_key !== "string" ||
      !credentials.wallet_state_init ||
      typeof credentials.wallet_state_init !== "string"
    ) {
      return null;
    }

    let proof: TonProofSignature;
    try {
      proof = JSON.parse(credentials.proof) as TonProofSignature;
    } catch {
      return null;
    }

    const network =
      typeof credentials.network === "string" && credentials.network.length > 0 ? credentials.network : "-239";

    return await authenticateTonWallet({
      address: credentials.address,
      network,
      publicKey: credentials.public_key,
      walletStateInit: credentials.wallet_state_init,
      proof,
    });
  },
});
