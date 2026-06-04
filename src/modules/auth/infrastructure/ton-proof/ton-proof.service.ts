import { getSecureRandomBytes, sha256 } from "@ton/crypto";
import { Address, Cell, contractAddress, loadStateInit } from "@ton/core";
import { sign } from "tweetnacl";
import type { TonConnectProofRequest } from "@/modules/auth/infrastructure/ton-proof/ton-proof.schema";
import { tryParsePublicKey } from "@/modules/auth/infrastructure/ton-proof/try-parse-public-key";
import { getTonProofAllowedDomains } from "@/shared/config/auth.config";

const TON_PROOF_PREFIX = "ton-proof-item-v2/";
const TON_CONNECT_PREFIX = "ton-connect";
const VALID_AUTH_SECONDS = 15 * 60;

export class TonProofService {
  /** Generates a random payload for the wallet `ton_proof` request. */
  async generatePayload(): Promise<string> {
    const bytes = await getSecureRandomBytes(32);
    return Buffer.from(bytes).toString("base64url");
  }

  /**
   * Verifies TON Connect address proof per ton-connect spec.
   * @see https://github.com/ton-blockchain/ton-connect/blob/main/requests-responses.md
   */
  async checkProof(request: TonConnectProofRequest): Promise<boolean> {
    try {
      const stateInit = loadStateInit(Cell.fromBase64(request.walletStateInit).beginParse());
      const publicKey =
        tryParsePublicKey(stateInit) ?? Buffer.from(request.publicKey, "hex");

      const wantedPublicKey = Buffer.from(request.publicKey, "hex");
      if (!publicKey.equals(wantedPublicKey)) {
        return false;
      }

      const wantedAddress = Address.parse(request.address);
      const derivedAddress = contractAddress(wantedAddress.workChain, stateInit);
      if (!derivedAddress.equals(wantedAddress)) {
        return false;
      }

      const allowedDomains = getTonProofAllowedDomains();
      if (!allowedDomains.includes(request.proof.domain.value)) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      if (now - VALID_AUTH_SECONDS > request.proof.timestamp) {
        return false;
      }

      const wc = Buffer.alloc(4);
      wc.writeUInt32BE(derivedAddress.workChain, 0);

      const ts = Buffer.alloc(8);
      ts.writeBigUInt64LE(BigInt(request.proof.timestamp), 0);

      const dl = Buffer.alloc(4);
      dl.writeUInt32LE(request.proof.domain.lengthBytes, 0);

      const msg = Buffer.concat([
        Buffer.from(TON_PROOF_PREFIX),
        wc,
        derivedAddress.hash,
        dl,
        Buffer.from(request.proof.domain.value),
        ts,
        Buffer.from(request.proof.payload),
      ]);

      const msgHash = Buffer.from(await sha256(msg));
      const fullMsg = Buffer.concat([
        Buffer.from([0xff, 0xff]),
        Buffer.from(TON_CONNECT_PREFIX),
        msgHash,
      ]);
      const result = Buffer.from(await sha256(fullMsg));
      const signature = Buffer.from(request.proof.signature, "base64");

      return sign.detached.verify(result, signature, publicKey);
    } catch {
      return false;
    }
  }
}
