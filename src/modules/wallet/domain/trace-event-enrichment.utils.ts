import type { AccountEvent, Action, JettonPreview } from "@/shared/infrastructure/api/tonapi";
import { Address } from "@ton/core";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";
import {
  isDtradeSellOperation,
  parseDtradeSellJettonAmountFromBody,
} from "@/modules/wallet/domain/dtrade-sell-decode.utils";

const DTRADE_FEE_PATTERN = /dtrade/i;
const JETTON_INTERNAL_TRANSFER_OP = /jettoninternaltransfer/i;
/** Proceeds below this are treated as gas/refund noise on DTrade sells. */
const MIN_DTRADE_SELL_PROCEEDS_NANOTON = 500_000_000n;

export interface TraceEventFetcher {
  getEvent(eventId: string): Promise<{ actions: Action[] }>;
}

export interface JettonMetadataFetcher {
  getJettonInfo(masterAddress: string): Promise<JettonPreview | null>;
}

export interface BlockchainTransactionFetcher {
  getIncomingMessageBody(transactionHash: string): Promise<unknown | null>;
}

interface ParsedJettonInternalTransfer {
  amount: bigint;
  responseAddressRaw: string;
}

function normalizeAddress(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return toRawTonAddress(value).toLowerCase();
  } catch {
    return null;
  }
}

function accountRaw(event: AccountEvent): string | null {
  return normalizeAddress(event.account.address?.toString());
}

function hasSwapAggregateAction(event: AccountEvent): boolean {
  return event.actions.some(action => action.type === "JettonSwap");
}

function hasJettonReceiveAction(event: AccountEvent): boolean {
  return event.actions.some(action => {
    if (action.type === "JettonMint" && action.JettonMint) {
      return true;
    }

    if (action.type === "JettonTransfer" && action.JettonTransfer) {
      const wallet = accountRaw(event);
      const recipient = normalizeAddress(action.JettonTransfer.recipient?.address?.toString());
      return wallet !== null && recipient === wallet;
    }

    return false;
  });
}

function hasJettonOutgoingAction(event: AccountEvent): boolean {
  const wallet = accountRaw(event);
  if (!wallet) {
    return false;
  }

  return event.actions.some(action => {
    if (action.type === "JettonTransfer" && action.JettonTransfer) {
      const sender = normalizeAddress(action.JettonTransfer.sender?.address?.toString());
      const amount = action.JettonTransfer.amount ?? 0n;
      return sender === wallet && amount > 0n;
    }

    if (action.type === "JettonBurn" && action.JettonBurn) {
      const sender = normalizeAddress(action.JettonBurn.sender?.address?.toString());
      const amount = action.JettonBurn.amount ?? 0n;
      return sender === wallet && amount > 0n;
    }

    return false;
  });
}

function findLargestTonProceeds(event: AccountEvent, wallet: string): { senderMaster: string; amount: bigint } | null {
  let best: { senderMaster: string; amount: bigint } | null = null;

  for (const action of event.actions) {
    if (action.type !== "TonTransfer" || !action.TonTransfer) {
      continue;
    }

    const recipient = normalizeAddress(action.TonTransfer.recipient?.address?.toString());
    const sender = normalizeAddress(action.TonTransfer.sender?.address?.toString());
    const amount = action.TonTransfer.amount ?? 0n;
    const comment = action.TonTransfer.comment ?? "";

    if (recipient !== wallet || !sender || sender === wallet || DTRADE_FEE_PATTERN.test(comment)) {
      continue;
    }

    if (amount < MIN_DTRADE_SELL_PROCEEDS_NANOTON) {
      continue;
    }

    if (!best || amount > best.amount) {
      best = { senderMaster: sender, amount };
    }
  }

  return best;
}

function hasWalletTonPayment(event: AccountEvent, wallet: string): boolean {
  return event.actions.some(action => {
    if (action.type === "SmartContractExec" && action.SmartContractExec) {
      const executor = normalizeAddress(action.SmartContractExec.executor?.address?.toString());
      const tonAttached = action.SmartContractExec.tonAttached ?? 0n;
      return executor === wallet && tonAttached > 0n;
    }

    if (action.type === "TonTransfer" && action.TonTransfer) {
      const sender = normalizeAddress(action.TonTransfer.sender?.address?.toString());
      const amount = action.TonTransfer.amount ?? 0n;
      const comment = action.TonTransfer.comment ?? "";
      if (DTRADE_FEE_PATTERN.test(comment)) {
        return false;
      }
      return sender === wallet && amount > 0n;
    }

    return false;
  });
}

function hasDtradeFeeHint(event: AccountEvent): boolean {
  return event.actions.some(action => {
    if (action.type !== "TonTransfer" || !action.TonTransfer) {
      return false;
    }

    const comment = action.TonTransfer.comment ?? "";
    return DTRADE_FEE_PATTERN.test(comment);
  });
}

/**
 * Account-scoped TonAPI events often omit jetton legs for DTrade bonding-curve mint buy/sell.
 * Trace-level `getEvent` + blockchain tx body still contain the missing amounts.
 */
export function accountEventNeedsTraceEnrichment(event: AccountEvent): boolean {
  if (hasSwapAggregateAction(event) || hasJettonReceiveAction(event) || hasJettonOutgoingAction(event)) {
    return false;
  }

  const wallet = accountRaw(event);
  if (!wallet) {
    return false;
  }

  if (!hasDtradeFeeHint(event)) {
    return false;
  }

  if (hasWalletTonPayment(event, wallet)) {
    return true;
  }

  return findLargestTonProceeds(event, wallet) !== null;
}

function parseJettonInternalTransferPayload(payload: string | undefined): ParsedJettonInternalTransfer | null {
  if (!payload) {
    return null;
  }

  const amountMatch = payload.match(/Amount:\s*"(\d+)"/i);
  const responseMatch = payload.match(/ResponseAddress:\s*(0:[0-9a-f]+)/i);

  if (!amountMatch || !responseMatch) {
    return null;
  }

  const amount = BigInt(amountMatch[1]);
  if (amount <= 0n) {
    return null;
  }

  return {
    amount,
    responseAddressRaw: responseMatch[1],
  };
}

function findWalletPaymentJettonMaster(event: AccountEvent, wallet: string): string | null {
  for (const action of event.actions) {
    if (action.type !== "SmartContractExec" || !action.SmartContractExec) {
      continue;
    }

    const executor = normalizeAddress(action.SmartContractExec.executor?.address?.toString());
    const contract = action.SmartContractExec.contract?.address?.toString();
    const tonAttached = action.SmartContractExec.tonAttached ?? 0n;

    if (executor === wallet && contract && tonAttached > 0n) {
      return contract;
    }
  }

  return null;
}

function findIncomingJettonAction(traceActions: Action[], wallet: string): Action | null {
  for (const action of traceActions) {
    if (action.type === "JettonMint" && action.JettonMint) {
      const recipient = normalizeAddress(action.JettonMint.recipient?.address?.toString());
      if (recipient === wallet && action.JettonMint.amount > 0n) {
        return action;
      }
    }

    if (action.type === "JettonTransfer" && action.JettonTransfer) {
      const recipient = normalizeAddress(action.JettonTransfer.recipient?.address?.toString());
      if (recipient === wallet && action.JettonTransfer.amount > 0n) {
        return action;
      }
    }
  }

  return null;
}

function findWalletDtradeSellExec(actions: Action[], wallet: string): Action | null {
  for (const action of actions) {
    if (action.type !== "SmartContractExec" || !action.SmartContractExec) {
      continue;
    }

    const executor = normalizeAddress(action.SmartContractExec.executor?.address?.toString());
    if (executor !== wallet) {
      continue;
    }

    if (isDtradeSellOperation(action.SmartContractExec.operation)) {
      return action;
    }
  }

  return null;
}

function buildSyntheticJettonTransferOutAction(params: {
  walletRaw: string;
  jetton: JettonPreview;
  amount: bigint;
  counterpartyRaw: string;
}): Action {
  return {
    type: "JettonTransfer",
    status: "ok",
    JettonTransfer: {
      sender: {
        address: Address.parse(params.walletRaw),
        isScam: false,
        isWallet: true,
      },
      recipient: {
        address: Address.parse(toRawTonAddress(params.counterpartyRaw)),
        isScam: false,
        isWallet: false,
      },
      jetton: params.jetton,
      amount: params.amount,
    },
    simplePreview: {
      name: "Jetton Transfer",
      description: "Transfer (trace-enriched sell)",
      value: params.amount.toString(),
      accounts: [],
    },
    baseTransactions: [],
  } as unknown as Action;
}

function buildSyntheticJettonMintAction(params: { walletRaw: string; jetton: JettonPreview; amount: bigint }): Action {
  return {
    type: "JettonMint",
    status: "ok",
    JettonMint: {
      recipient: {
        address: Address.parse(params.walletRaw),
        isScam: false,
        isWallet: true,
      },
      jetton: params.jetton,
      amount: params.amount,
    },
    simplePreview: {
      name: "Jetton Mint",
      description: "Mint (trace-enriched buy)",
      value: params.amount.toString(),
      accounts: [],
    },
    baseTransactions: [],
  } as unknown as Action;
}

async function resolveJettonPreview(
  masterAddress: string,
  fetchJettonInfo: JettonMetadataFetcher
): Promise<JettonPreview | null> {
  try {
    return await fetchJettonInfo.getJettonInfo(masterAddress);
  } catch {
    return null;
  }
}

/**
 * Merges missing jetton receive legs from trace event into account event actions.
 */
async function enrichDtradeSellFromTrace(
  event: AccountEvent,
  traceActions: Action[],
  wallet: string,
  walletAddressForAction: string,
  jettonFetcher: JettonMetadataFetcher,
  transactionFetcher: BlockchainTransactionFetcher
): Promise<AccountEvent | null> {
  const proceeds = findLargestTonProceeds(event, wallet);
  if (!proceeds) {
    return null;
  }

  const sellExec = findWalletDtradeSellExec(event.actions, wallet) ?? findWalletDtradeSellExec(traceActions, wallet);
  if (!sellExec?.SmartContractExec) {
    return null;
  }

  const txHash = sellExec.baseTransactions?.[0];
  if (!txHash) {
    return null;
  }

  const rawBody = await transactionFetcher.getIncomingMessageBody(txHash);
  if (!rawBody) {
    return null;
  }

  const jettonAmount = parseDtradeSellJettonAmountFromBody(rawBody);
  if (!jettonAmount) {
    return null;
  }

  const jettonMaster = proceeds.senderMaster;
  const resolvedJettonPreview = await resolveJettonPreview(jettonMaster, jettonFetcher);
  const jettonPreview: JettonPreview =
    resolvedJettonPreview ??
    ({
      address: Address.parse(toRawTonAddress(jettonMaster)),
      name: "",
      symbol: "",
      decimals: 9,
      verification: "none",
      score: 0,
    } as JettonPreview);

  const syntheticTransfer = buildSyntheticJettonTransferOutAction({
    walletRaw: walletAddressForAction,
    jetton: jettonPreview,
    amount: jettonAmount,
    counterpartyRaw: sellExec.SmartContractExec.contract?.address?.toString() ?? jettonMaster,
  });

  return {
    ...event,
    actions: [...event.actions, syntheticTransfer],
  };
}

export async function enrichAccountEventFromTrace(
  event: AccountEvent,
  traceFetcher: TraceEventFetcher,
  jettonFetcher: JettonMetadataFetcher,
  transactionFetcher: BlockchainTransactionFetcher
): Promise<AccountEvent> {
  if (!accountEventNeedsTraceEnrichment(event)) {
    return event;
  }

  const wallet = accountRaw(event);
  if (!wallet) {
    return event;
  }

  const walletAddressForAction = toRawTonAddress(event.account.address!.toString());

  let traceEvent: { actions: Action[] };
  try {
    traceEvent = await traceFetcher.getEvent(event.eventId);
  } catch {
    return event;
  }

  const incomingJetton = findIncomingJettonAction(traceEvent.actions, wallet);
  if (incomingJetton) {
    return {
      ...event,
      actions: [...event.actions, incomingJetton],
    };
  }

  const jettonMaster = findWalletPaymentJettonMaster(event, wallet);

  if (!jettonMaster) {
    const sellOnly = await enrichDtradeSellFromTrace(
      event,
      traceEvent.actions,
      wallet,
      walletAddressForAction,
      jettonFetcher,
      transactionFetcher
    );
    return sellOnly ?? event;
  }

  let parsedTransfer: ParsedJettonInternalTransfer | null = null;

  for (const action of traceEvent.actions) {
    if (action.type !== "SmartContractExec" || !action.SmartContractExec) {
      continue;
    }

    const operation = action.SmartContractExec.operation ?? "";
    if (!JETTON_INTERNAL_TRANSFER_OP.test(operation)) {
      continue;
    }

    const parsed = parseJettonInternalTransferPayload(action.SmartContractExec.payload);
    if (!parsed) {
      continue;
    }

    const response = normalizeAddress(parsed.responseAddressRaw);
    if (response === wallet) {
      parsedTransfer = parsed;
      break;
    }
  }

  if (!parsedTransfer) {
    const sellEnriched = await enrichDtradeSellFromTrace(
      event,
      traceEvent.actions,
      wallet,
      walletAddressForAction,
      jettonFetcher,
      transactionFetcher
    );
    return sellEnriched ?? event;
  }

  const resolvedJettonPreview = await resolveJettonPreview(jettonMaster, jettonFetcher);
  const jettonPreview: JettonPreview =
    resolvedJettonPreview ??
    ({
      address: Address.parse(toRawTonAddress(jettonMaster)),
      name: "",
      symbol: "",
      decimals: 9,
      verification: "none",
      score: 0,
    } as JettonPreview);

  const syntheticMint = buildSyntheticJettonMintAction({
    walletRaw: walletAddressForAction,
    jetton: jettonPreview,
    amount: parsedTransfer.amount,
  });

  return {
    ...event,
    actions: [...event.actions, syntheticMint],
  };
}
