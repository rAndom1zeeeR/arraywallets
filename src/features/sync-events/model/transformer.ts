import { Address } from "@ton/core";
import { AccountEvent, Action, JettonPreview, AccountAddress } from "@ton-api/client";
import { ChainActionType, ChainActionStatus, ChainActionDirection } from "@generated/prisma/client";
import { normalizeWalletAddress } from "@/shared/lib/ton-address";
import { serializeForJson } from "@/shared/lib/serialize-json";

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
  if (!addr) return undefined;
  return {
    raw: addr.address.toString(),
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
    address: jetton.address.toString(),
    name: jetton.name,
    symbol: jetton.symbol,
    decimals: jetton.decimals,
    image: jetton.image,
    verification: jetton.verification,
    score: jetton.score,
  };
}

// Помощник для форматирования суммы
function formatAmount(amount: bigint | undefined, decimals: number, symbol: string): string | undefined {
  if (amount === undefined || amount === null) return undefined;

  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;

  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  const value = fracStr ? `${whole}.${fracStr}` : whole.toString();

  return `${value} ${symbol}`;
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
function bigintToDecimal(value: bigint | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value.toString();
}

// Определение направления операции
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
    status: action.status === "ok" ? ChainActionStatus.success : ChainActionStatus.failed,
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

        const sign = result.direction === ChainActionDirection.INCOMING ? "+" : "-";
        result.description = `${sign}${result.displayAmount}`;
        if (tf.comment) {
          result.description += ` • ${tf.comment.substring(0, 50)}${tf.comment.length > 50 ? "..." : ""}`;
        }
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
          const sign = result.direction === ChainActionDirection.INCOMING ? "+" : "-";
          result.description = `${sign}${result.displayAmount}`;
        }
        if (jt.comment) {
          result.description += ` • ${jt.comment.substring(0, 40)}${jt.comment.length > 40 ? "..." : ""}`;
        }
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

        // Формируем детали свопа
        const parts: string[] = [];
        if (js.jettonMasterIn && js.amountIn) {
          parts.push(`-${formatAmount(js.amountIn, js.jettonMasterIn.decimals, js.jettonMasterIn.symbol)}`);
        } else if (js.tonIn && js.tonIn > 0n) {
          parts.push(`-${formatAmount(js.tonIn, 9, "TON")}`);
        }
        parts.push("→");
        if (js.jettonMasterOut && js.amountOut) {
          parts.push(`+${formatAmount(js.amountOut, js.jettonMasterOut.decimals, js.jettonMasterOut.symbol)}`);
        } else if (js.tonOut && js.tonOut > 0n) {
          parts.push(`+${formatAmount(js.tonOut, 9, "TON")}`);
        }
        result.description = `${js.dex}: ${parts.join(" ")}`;
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
          result.description = `Burn: ${result.displayAmount}`;
        }
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
          result.description = `Mint: +${result.displayAmount}`;
        }
      }
      break;
    }

    case "SmartContractExec": {
      const sce = action.SmartContractExec;
      if (sce) {
        result.type = ChainActionType.SMART_CONTRACT_EXEC;
        result.fromRaw = addAddress(sce.executor);
        result.toRaw = addAddress(sce.contract);
        result.amount = bigintToDecimal(sce.tonAttached);
        result.details = {
          operation: sce.operation,
          payload: sce.payload,
        };
        result.displayAmount = formatAmount(sce.tonAttached, 9, "TON");
        result.displayCurrency = "TON";
        result.description = `Contract: ${sce.operation}`;
        if (sce.tonAttached && sce.tonAttached > 0n) {
          result.description += ` (${result.displayAmount})`;
        }
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
        result.description = `Stake: ${ds.pool?.name || ds.pool?.address?.toString()?.slice(0, 10)}...`;
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
        result.description = `Unstake: ${ws.pool?.name || ws.pool?.address?.toString()?.slice(0, 10)}...`;
      }
      break;
    }

    case "NftItemTransfer": {
      const nft = action.NftItemTransfer;
      if (nft) {
        result.type = ChainActionType.NFT_TRANSFER;
        result.fromRaw = addAddress(nft.sender);
        result.toRaw = addAddress(nft.recipient);
        result.direction = determineDirection(
          result.fromRaw,
          result.toRaw,
          eventAccountAddress
        );
        const nftAddress = toAddressString(nft.nft as string | Address);
        const nftShort =
          nftAddress.length > 12
            ? `${nftAddress.slice(0, 6)}…${nftAddress.slice(-4)}`
            : nftAddress;
        result.displayAmount = "NFT";
        result.description = `NFT ${nftShort}`;
        if (nft.comment) {
          result.description += ` • ${nft.comment.substring(0, 40)}${nft.comment.length > 40 ? "..." : ""}`;
        }
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
      result.description = "Subscribe";
      break;
    }

    case "UnSubscribe": {
      result.type = ChainActionType.UNSUBSCRIBE;
      result.description = "Unsubscribe";
      break;
    }

    case "AuctionBid": {
      result.type = ChainActionType.AUCTION_BID;
      result.description = "Auction Bid";
      break;
    }

    case "DomainRenew": {
      result.type = ChainActionType.DOMAIN_RENEW;
      result.description = "Domain Renew";
      break;
    }

    default:
      result.type = ChainActionType.UNKNOWN;
      result.details = {
        originalType: action.type,
        simplePreview: action.simplePreview,
      };
      result.description = action.simplePreview?.description || action.type;
  }

  return { tx: result, addresses, jettons };
}

// Основная функция трансформации
export function transformAccountEvent(event: AccountEvent): TransformedEvent {
  const accountRaw = normalizeWalletAddress(event.account.address.toString());

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
