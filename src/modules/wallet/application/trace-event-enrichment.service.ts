import type { AccountEvent, JettonPreview } from "@/shared/infrastructure/api/tonapi";
import { Address } from "@ton/core";
import { TONAPI_CLIENT } from "@/shared/infrastructure/api/tonapi-client";
import { callTonapi } from "@/shared/infrastructure/tonapi/tonapi-limiter";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";
import {
  accountEventNeedsTraceEnrichment,
  enrichAccountEventFromTrace,
} from "@/modules/wallet/domain/trace-event-enrichment.utils";

interface TonApiJettonInfoResponse {
  metadata?: {
    address?: string | { toString(): string };
    name?: string;
    symbol?: string;
    decimals?: number | string;
    image?: string;
  };
  verification?: string;
  score?: number;
}

function mapJettonInfoFromApi(info: TonApiJettonInfoResponse): JettonPreview | null {
  const metadata = info.metadata;
  if (!metadata?.address) {
    return null;
  }

  const address = typeof metadata.address === "string" ? metadata.address : metadata.address.toString();
  const decimalsRaw = metadata.decimals ?? 9;
  const decimals = typeof decimalsRaw === "string" ? Number.parseInt(decimalsRaw, 10) : decimalsRaw;

  return {
    address: Address.parse(toRawTonAddress(address)),
    name: metadata.name ?? "",
    symbol: metadata.symbol ?? "",
    decimals: Number.isFinite(decimals) ? decimals : 9,
    image: metadata.image ?? "",
    verification: (info.verification ?? "none") as JettonPreview["verification"],
    score: info.score ?? 0,
  };
}

const traceFetcher = {
  async getEvent(eventId: string) {
    const trace = await callTonapi(() => TONAPI_CLIENT.getEvent(eventId));
    return { actions: trace.actions };
  },
};

const jettonFetcher = {
  async getJettonInfo(masterAddress: string): Promise<JettonPreview | null> {
    const info = await callTonapi(() => TONAPI_CLIENT.getJettonInfo(masterAddress));
    return mapJettonInfoFromApi(info as TonApiJettonInfoResponse);
  },
};

interface BlockchainTransactionResponse {
  inMsg?: { rawBody?: unknown };
  in_msg?: { raw_body?: unknown };
}

const transactionFetcher = {
  async getIncomingMessageBody(transactionHash: string): Promise<unknown | null> {
    try {
      const tx = (await callTonapi(() =>
        TONAPI_CLIENT.getBlockchainTransaction(transactionHash)
      )) as BlockchainTransactionResponse;
      return tx.inMsg?.rawBody ?? tx.in_msg?.raw_body ?? null;
    } catch {
      return null;
    }
  },
};

/**
 * Enriches account events with trace-level jetton legs before swap inference.
 */
export async function prepareAccountEventForTransform(event: AccountEvent): Promise<AccountEvent> {
  if (!accountEventNeedsTraceEnrichment(event)) {
    return event;
  }

  return enrichAccountEventFromTrace(event, traceFetcher, jettonFetcher, transactionFetcher);
}

export { accountEventNeedsTraceEnrichment };
