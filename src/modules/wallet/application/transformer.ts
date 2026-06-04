import { Address } from "@ton/core";
import { AccountEvent, Action, JettonPreview, AccountAddress } from "@/shared/infrastructure/api/tonapi";
import { ChainActionType, ChainActionStatus, ChainActionDirection } from "@/shared/infrastructure/api/prisma-client";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";
import { serializeForJson } from "@/shared/infrastructure/sync/serialize-json";
import { isAmountLabelEquivalent, normalizeSimplePreviewText } from "@/modules/wallet/domain/display-details.utils";
import { inferSwapsFromTransactions } from "@/modules/swap/domain/swap-inference.utils";
import { formatMoneyJetton, formatMoneyTonFromNanoton } from "@/modules/jetton/domain/money-format.utils";

// Типы для промежуточного результата трансформации
export interface TransformedAddress {
  raw: string; // используем 'raw' вместо 'rawAddress' как в схеме
  name?: string;
  isScam: boolean;
  icon?: string;
  isWallet: boolean;
}

export interface TransformedJetton {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  image?: string;
  verification: string;
  score: number;
}

export interface TransformedTransaction {
  orderIndex: number;
  type: ChainActionType;
  status: ChainActionStatus;
  fromRaw?: string; // raw address string
  toRaw?: string; // raw address string
  direction?: ChainActionDirection;
  amount?: string; // Decimal as string
  amount2?: string;
  tonIn?: string;
  tonOut?: string;
  fee?: string;
  jettonAddress?: string;
  jetton2Address?: string;
  details: Record<string, unknown>;
  displayAmount?: string;
  displayCurrency?: string;
  description?: string;
}

export interface TransformedEvent {
  eventId: string;
  accountRaw: string; // raw address string
  timestamp: Date;
  lt: string; // Decimal as string
  isScam: boolean;
  inProgress: boolean;
  extra: bigint;
  rawData: Record<string, unknown>;
  transactions: TransformedTransaction[];
  addresses: TransformedAddress[];
  jettons: TransformedJetton[];
}

// Помощник для извлечения адреса
// function getAddressString(addr: AccountAddress | undefined): string | undefined {
//   if (!addr) return undefined;
//   return addr.address.toString();
// }

// Помощник для преобразования AccountAddress в наш формат
function transformAddress(addr: AccountAddress | undefined): TransformedAddress | undefined {
  if (!addr?.address) return undefined;
  return {
    raw: toRawTonAddress(addr.address.toString()),
    name: addr.name,
    isScam: addr.isScam,
    icon: addr.icon,
    isWallet: addr.isWallet,
  };
}

// Помощник для преобразования JettonPreview в наш формат
function transformJetton(jetton: JettonPreview | undefined): TransformedJetton | undefined {
  if (!jetton) return undefined;
  return {
    address: toRawTonAddress(jetton.address.toString()),
    name: jetton.name,
    symbol: jetton.symbol,
    decimals: jetton.decimals,
    image: jetton.image,
    verification: jetton.verification,
    score: jetton.score,
  };
}

/** Formats smallest-unit amount for Events displayAmount (stored in DB). */
function formatAmount(
  amount: bigint | string | number | undefined | null,
  decimals: number,
  symbol: string
): string | undefined {
  const coerced = coerceBigInt(amount ?? undefined);
  if (coerced === undefined) {
    return undefined;
  }

  if (symbol === "TON" && decimals === 9) {
    return formatMoneyTonFromNanoton(coerced);
  }

  return formatMoneyJetton(coerced, decimals, symbol);
}

function formatSwapDisplayAmount(swap: NonNullable<Action["JettonSwap"]>): string | undefined {
  const parts: string[] = [];

  const amountIn = coerceBigInt(swap.amountIn);
  const tonIn = coerceBigInt(swap.tonIn);
  const amountOut = coerceBigInt(swap.amountOut);
  const tonOut = coerceBigInt(swap.tonOut);

  if (swap.jettonMasterIn && amountIn !== undefined) {
    parts.push(`-${formatAmount(amountIn, swap.jettonMasterIn.decimals, swap.jettonMasterIn.symbol) ?? ""}`);
  } else if (tonIn !== undefined && tonIn > 0n) {
    parts.push(`-${formatAmount(tonIn, 9, "TON") ?? ""}`);
  }

  parts.push("→");

  if (swap.jettonMasterOut && amountOut !== undefined) {
    parts.push(`+${formatAmount(amountOut, swap.jettonMasterOut.decimals, swap.jettonMasterOut.symbol) ?? ""}`);
  } else if (tonOut !== undefined && tonOut > 0n) {
    parts.push(`+${formatAmount(tonOut, 9, "TON") ?? ""}`);
  }

  const value = parts.filter(Boolean).join(" ");
  return value.length > 1 ? value : undefined;
}

function toAddressString(value: string | Address): string {
  return typeof value === "string" ? value : value.toString();
}

function toExtraBigInt(value: number | bigint | string): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "string") {
    return BigInt(value);
  }

  return BigInt(Math.trunc(value));
}

// Помощник для преобразования bigint в Decimal string
function bigintToDecimal(value: bigint | string | number | undefined | null): string | undefined {
  const coerced = coerceBigInt(value ?? undefined);
  if (coerced === undefined) {
    return undefined;
  }

  return coerced.toString();
}

function coerceBigInt(value: bigint | string | number | undefined | null): bigint | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && value.length > 0) {
    const normalized = value.trim().split(".")[0];
    return normalized.length > 0 ? BigInt(normalized) : undefined;
  }
  return undefined;
}

/** TonAPI FlawedJettonTransfer payload (SDK field names may be camelCase or snake_case). */
interface FlawedJettonTransferPayload {
  sender?: AccountAddress;
  recipient?: AccountAddress;
  sendersWallet?: string | Address;
  recipientsWallet?: string | Address;
  sentAmount?: bigint | string;
  receivedAmount?: bigint | string;
  sent_amount?: bigint | string;
  received_amount?: bigint | string;
  comment?: string;
  encryptedComment?: unknown;
  refund?: unknown;
  jetton?: JettonPreview;
}

function getFlawedJettonTransfer(action: Action): FlawedJettonTransferPayload | undefined {
  if (action.type !== "FlawedJettonTransfer") {
    return undefined;
  }

  const actionWithFlawed = action as Action & {
    FlawedJettonTransfer?: FlawedJettonTransferPayload;
  };

  return actionWithFlawed.FlawedJettonTransfer;
}

function formatFlawedJettonDisplayAmount(sentAmount: bigint, receivedAmount: bigint, jetton: JettonPreview): string {
  const sent = formatAmount(sentAmount, jetton.decimals, jetton.symbol);
  const received = formatAmount(receivedAmount, jetton.decimals, jetton.symbol);

  if (sent && received) {
    return `${sent} → ${received}`;
  }

  return sent ?? received ?? "";
}

// Определение направления операции
function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.substring(0, maxLength)}...`;
}

interface BuildDisplayDetailsOptions {
  comment?: string | null;
  extra?: string[];
  displayAmount?: string;
  direction?: ChainActionDirection;
}

/** Details column: comments and TonAPI simplePreview only (no amounts). */
function buildDisplayDetails(action: Action, options?: BuildDisplayDetailsOptions): string | undefined {
  const parts: string[] = [];

  if (options?.comment) {
    parts.push(truncateText(options.comment, 80));
  }

  if (options?.extra) {
    for (const item of options.extra) {
      const trimmed = item.trim();
      if (trimmed) {
        parts.push(trimmed);
      }
    }
  }

  const preview = action.simplePreview?.description?.trim();
  if (preview) {
    const normalizedPreview = normalizeSimplePreviewText(preview);
    const isDuplicate =
      !normalizedPreview ||
      (options?.displayAmount !== undefined &&
        isAmountLabelEquivalent(normalizedPreview, options.displayAmount, options.direction));

    if (normalizedPreview && !isDuplicate) {
      parts.push(truncateText(normalizedPreview, 80));
    }
  }

  const unique = [...new Set(parts)];
  return unique.length > 0 ? unique.join(" • ") : undefined;
}

function determineDirection(
  fromAddress: string | undefined,
  toAddress: string | undefined,
  eventAccountAddress: string
): ChainActionDirection {
  const eventAddr = eventAccountAddress.toLowerCase();
  const from = fromAddress?.toLowerCase();
  const to = toAddress?.toLowerCase();

  if (from === eventAddr && to === eventAddr) return ChainActionDirection.SELF;
  if (to === eventAddr) return ChainActionDirection.INCOMING;
  if (from === eventAddr) return ChainActionDirection.OUTGOING;

  return ChainActionDirection.UNKNOWN;
}

// Трансформация Action в Transaction
function transformAction(
  action: Action,
  index: number,
  eventAccountAddress: string
): { tx: TransformedTransaction; addresses: TransformedAddress[]; jettons: TransformedJetton[] } {
  const addresses: TransformedAddress[] = [];
  const jettons: TransformedJetton[] = [];

  const addAddress = (addr: AccountAddress | undefined): string | undefined => {
    if (!addr) return undefined;
    const transformed = transformAddress(addr);
    if (transformed) {
      addresses.push(transformed);
      return transformed.raw;
    }
    return undefined;
  };

  const addJetton = (jetton: JettonPreview | undefined): string | undefined => {
    if (!jetton) return undefined;
    const transformed = transformJetton(jetton);
    if (transformed) {
      jettons.push(transformed);
      return transformed.address;
    }
    return undefined;
  };

  const result: TransformedTransaction = {
    orderIndex: index,
    type: ChainActionType.UNKNOWN,
    status: action.status === "ok" ? ChainActionStatus.SUCCESS : ChainActionStatus.FAILED,
    details: {},
  };

  // Обработка в зависимости от типа
  switch (action.type) {
    case "TonTransfer": {
      const tf = action.TonTransfer;
      if (tf) {
        result.type = ChainActionType.TON_TRANSFER;
        result.fromRaw = addAddress(tf.sender);
        result.toRaw = addAddress(tf.recipient);
        result.direction = determineDirection(result.fromRaw, result.toRaw, eventAccountAddress);
        result.amount = bigintToDecimal(tf.amount);
        result.fee = bigintToDecimal(tf.amount); // TODO: правильный fee
        result.displayAmount = formatAmount(tf.amount, 9, "TON");
        result.displayCurrency = "TON";
        result.details = {
          comment: tf.comment,
          encryptedComment: tf.encryptedComment,
          refund: tf.refund,
        };

        result.description = buildDisplayDetails(action, {
          comment: tf.comment,
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "FlawedJettonTransfer": {
      const fjt = getFlawedJettonTransfer(action);
      if (fjt) {
        const sentAmount = coerceBigInt(fjt.sentAmount) ?? coerceBigInt(fjt.sent_amount);
        const receivedAmount = coerceBigInt(fjt.receivedAmount) ?? coerceBigInt(fjt.received_amount);

        result.type = ChainActionType.FLAWED_JETTON_TRANSFER;
        result.fromRaw = addAddress(fjt.sender);
        result.toRaw = addAddress(fjt.recipient);
        result.direction = determineDirection(result.fromRaw, result.toRaw, eventAccountAddress);
        result.jettonAddress = addJetton(fjt.jetton);

        if (sentAmount !== undefined) {
          result.amount = bigintToDecimal(sentAmount);
        }
        if (receivedAmount !== undefined) {
          result.amount2 = bigintToDecimal(receivedAmount);
        }

        result.details = {
          sentAmount: sentAmount !== undefined ? bigintToDecimal(sentAmount) : undefined,
          receivedAmount: receivedAmount !== undefined ? bigintToDecimal(receivedAmount) : undefined,
          sendersWallet: typeof fjt.sendersWallet === "string" ? fjt.sendersWallet : fjt.sendersWallet?.toString(),
          recipientsWallet:
            typeof fjt.recipientsWallet === "string" ? fjt.recipientsWallet : fjt.recipientsWallet?.toString(),
          comment: fjt.comment,
          encryptedComment: fjt.encryptedComment,
          refund: fjt.refund,
        };

        if (fjt.jetton && sentAmount !== undefined && receivedAmount !== undefined) {
          result.displayAmount = formatFlawedJettonDisplayAmount(sentAmount, receivedAmount, fjt.jetton);
          result.displayCurrency = fjt.jetton.symbol;
        }

        result.description = buildDisplayDetails(action, {
          comment: fjt.comment,
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "JettonTransfer": {
      const jt = action.JettonTransfer;
      if (jt) {
        result.type = ChainActionType.JETTON_TRANSFER;
        result.fromRaw = addAddress(jt.sender);
        result.toRaw = addAddress(jt.recipient);
        result.direction = determineDirection(result.fromRaw, result.toRaw, eventAccountAddress);
        result.jettonAddress = addJetton(jt.jetton);
        result.amount = bigintToDecimal(jt.amount);
        result.details = {
          comment: jt.comment,
          encryptedComment: jt.encryptedComment,
          sendersWallet: jt.sendersWallet?.toString(),
          recipientsWallet: jt.recipientsWallet?.toString(),
          refund: jt.refund,
        };

        if (jt.jetton) {
          result.displayAmount = formatAmount(jt.amount, jt.jetton.decimals, jt.jetton.symbol);
          result.displayCurrency = jt.jetton.symbol;
        }
        result.description = buildDisplayDetails(action, {
          comment: jt.comment,
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "JettonSwap": {
      const js = action.JettonSwap;
      if (js) {
        result.type = ChainActionType.JETTON_SWAP;
        result.fromRaw = addAddress(js.userWallet);
        result.tonIn = bigintToDecimal(js.tonIn);
        result.tonOut = bigintToDecimal(js.tonOut);
        result.amount = bigintToDecimal(js.amountIn); // основная сумма = amountIn
        result.amount2 = bigintToDecimal(js.amountOut);
        result.jettonAddress = addJetton(js.jettonMasterIn);
        result.jetton2Address = addJetton(js.jettonMasterOut);
        result.details = {
          dex: js.dex,
          router: js.router?.address?.toString(),
        };

        result.displayAmount = formatSwapDisplayAmount(js);
        result.description = buildDisplayDetails(action, {
          extra: [js.dex],
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "JettonBurn": {
      const jb = action.JettonBurn;
      if (jb) {
        result.type = ChainActionType.JETTON_BURN;
        result.fromRaw = addAddress(jb.sender);
        result.jettonAddress = addJetton(jb.jetton);
        result.amount = bigintToDecimal(jb.amount);
        result.direction = ChainActionDirection.OUTGOING;
        result.details = {
          sendersWallet: jb.sendersWallet?.toString(),
        };
        if (jb.jetton) {
          result.displayAmount = formatAmount(jb.amount, jb.jetton.decimals, jb.jetton.symbol);
          result.displayCurrency = jb.jetton.symbol;
        }
        result.description = buildDisplayDetails(action, {
          extra: ["Burn"],
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "JettonMint": {
      const jm = action.JettonMint;
      if (jm) {
        result.type = ChainActionType.JETTON_MINT;
        result.toRaw = addAddress(jm.recipient);
        result.direction = ChainActionDirection.INCOMING;
        result.jettonAddress = addJetton(jm.jetton);
        result.amount = bigintToDecimal(jm.amount);
        result.details = {
          recipientsWallet: jm.recipientsWallet?.toString(),
        };
        if (jm.jetton) {
          result.displayAmount = formatAmount(jm.amount, jm.jetton.decimals, jm.jetton.symbol);
          result.displayCurrency = jm.jetton.symbol;
        }
        result.description = buildDisplayDetails(action, {
          extra: ["Mint"],
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "SmartContractExec": {
      const sce = action.SmartContractExec;
      if (sce) {
        result.type = ChainActionType.SMART_CONTRACT_EXEC;
        result.fromRaw = addAddress(sce.executor);
        result.toRaw = addAddress(sce.contract);
        result.direction = determineDirection(result.fromRaw, result.toRaw, eventAccountAddress);
        result.amount = bigintToDecimal(sce.tonAttached);
        result.details = {
          operation: sce.operation,
          payload: sce.payload,
        };
        result.displayAmount = formatAmount(sce.tonAttached, 9, "TON");
        result.displayCurrency = "TON";
        result.description = buildDisplayDetails(action, {
          extra: [`Contract: ${sce.operation}`],
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "DepositStake": {
      const ds = action.DepositStake;
      if (ds) {
        result.type = ChainActionType.DEPOSIT_STAKE;
        result.fromRaw = addAddress(ds.staker);
        result.toRaw = addAddress(ds.pool);
        result.direction = ChainActionDirection.OUTGOING;
        result.amount = bigintToDecimal(ds.amount);
        result.details = {
          implementation: ds.implementation,
          poolAddress: ds.pool?.address?.toString(),
        };
        result.displayAmount = formatAmount(ds.amount, 9, "TON");
        result.displayCurrency = "TON";
        result.description = buildDisplayDetails(action, {
          extra: [`Stake: ${ds.pool?.name || ds.pool?.address?.toString()?.slice(0, 10)}...`],
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "WithdrawStake": {
      const ws = action.WithdrawStake;
      if (ws) {
        result.type = ChainActionType.WITHDRAW_STAKE;
        result.toRaw = addAddress(ws.staker);
        result.fromRaw = addAddress(ws.pool);
        result.direction = ChainActionDirection.INCOMING;
        result.amount = bigintToDecimal(ws.amount);
        result.details = {
          implementation: ws.implementation,
          poolAddress: ws.pool?.address?.toString(),
        };
        result.displayAmount = formatAmount(ws.amount, 9, "TON");
        result.displayCurrency = "TON";
        result.description = buildDisplayDetails(action, {
          extra: [`Unstake: ${ws.pool?.name || ws.pool?.address?.toString()?.slice(0, 10)}...`],
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
      }
      break;
    }

    case "NftItemTransfer": {
      const nft = action.NftItemTransfer;
      if (nft) {
        result.type = ChainActionType.NFT_TRANSFER;
        result.fromRaw = addAddress(nft.sender);
        result.toRaw = addAddress(nft.recipient);
        result.direction = determineDirection(result.fromRaw, result.toRaw, eventAccountAddress);
        const nftAddress = toAddressString(nft.nft as string | Address);
        const nftShort = nftAddress.length > 12 ? `${nftAddress.slice(0, 6)}…${nftAddress.slice(-4)}` : nftAddress;
        result.displayAmount = "NFT";
        result.description = buildDisplayDetails(action, {
          comment: nft.comment,
          extra: [`NFT ${nftShort}`],
          displayAmount: result.displayAmount,
          direction: result.direction,
        });
        result.details = {
          nft: nftAddress,
          comment: nft.comment,
          encryptedComment: nft.encryptedComment,
          payload: nft.payload,
          refund: nft.refund,
        };
      }
      break;
    }

    case "Subscribe": {
      result.type = ChainActionType.SUBSCRIBE;
      result.description = buildDisplayDetails(action, { extra: ["Subscribe"] });
      break;
    }

    case "UnSubscribe": {
      result.type = ChainActionType.UNSUBSCRIBE;
      result.description = buildDisplayDetails(action, { extra: ["Unsubscribe"] });
      break;
    }

    case "AuctionBid": {
      result.type = ChainActionType.AUCTION_BID;
      result.description = buildDisplayDetails(action, { extra: ["Auction Bid"] });
      break;
    }

    case "DomainRenew": {
      result.type = ChainActionType.DOMAIN_RENEW;
      result.description = buildDisplayDetails(action, { extra: ["Domain Renew"] });
      break;
    }

    default:
      result.type = ChainActionType.UNKNOWN;
      result.details = {
        originalType: action.type,
        simplePreview: action.simplePreview,
      };
      result.description = buildDisplayDetails(action) ?? action.type;
  }

  return { tx: result, addresses, jettons };
}

// Основная функция трансформации
export function transformAccountEvent(event: AccountEvent): TransformedEvent {
  if (!event.account.address) {
    throw new Error(`AccountEvent ${event.eventId} has no account address`);
  }
  const accountRaw = toRawTonAddress(event.account.address.toString());

  const allAddresses: Map<string, TransformedAddress> = new Map();
  const allJettons: Map<string, TransformedJetton> = new Map();
  const transformedTransactions: TransformedTransaction[] = [];

  // Добавляем основной аккаунт
  allAddresses.set(accountRaw.toLowerCase(), {
    raw: accountRaw,
    name: event.account.name,
    isScam: event.account.isScam,
    icon: event.account.icon,
    isWallet: event.account.isWallet,
  });

  // Трансформируем каждое действие
  event.actions.forEach((action, index) => {
    const { tx, addresses, jettons } = transformAction(action, index, accountRaw);

    transformedTransactions.push(tx);

    addresses.forEach(addr => {
      const key = addr.raw.toLowerCase();
      if (!allAddresses.has(key)) {
        allAddresses.set(key, addr);
      }
    });

    jettons.forEach(jet => {
      const key = jet.address.toLowerCase();
      if (!allJettons.has(key)) {
        allJettons.set(key, jet);
      }
    });
  });

  const jettonsByAddress = new Map<string, TransformedJetton>(
    Array.from(allJettons.values()).map(jetton => [jetton.address.toLowerCase(), jetton])
  );

  const { inferredTransactions } = inferSwapsFromTransactions(transformedTransactions, accountRaw, jettonsByAddress);

  for (const inferred of inferredTransactions) {
    transformedTransactions.push(inferred);
  }

  const rawData = serializeForJson(event) as unknown as Record<string, unknown>;

  return {
    eventId: event.eventId,
    accountRaw,
    timestamp: new Date(event.timestamp * 1000),
    lt: event.lt.toString(),
    isScam: event.isScam,
    inProgress: event.inProgress,
    extra: toExtraBigInt(event.extra),
    rawData,
    transactions: transformedTransactions,
    addresses: Array.from(allAddresses.values()),
    jettons: Array.from(allJettons.values()),
  };
}
