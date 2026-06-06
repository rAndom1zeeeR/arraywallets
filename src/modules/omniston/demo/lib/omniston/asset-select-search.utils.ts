import { Address } from "@ton/core";

import { normalizeWalletAddress, tryToRawTonAddress } from "@/shared/lib/ton/ton-address";

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

/**
 * Builds ston.fi search terms from free text or a pasted jetton / ERC-20 contract address.
 */
export function buildAssetSearchTerms(
  input: string,
  options: { allowTonContract?: boolean; allowEvmContract?: boolean },
): string[] {
  const trimmed = input.trim();

  if (!trimmed) {
    return [];
  }

  const terms = new Set<string>([trimmed]);

  if (options.allowTonContract) {
    try {
      const friendly = normalizeWalletAddress(trimmed);
      const raw = tryToRawTonAddress(trimmed) ?? Address.parse(trimmed).toRawString();

      terms.add(friendly);
      terms.add(raw);
    } catch {
      // not a TON address — keep text search only
    }
  }

  if (options.allowEvmContract && EVM_ADDRESS_PATTERN.test(trimmed)) {
    terms.add(trimmed);
    terms.add(trimmed.toLowerCase());
  }

  return [...terms];
}
