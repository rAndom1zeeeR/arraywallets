"use client";

import type { Quote } from "@ston-fi/omniston-sdk-react";

import { ExplorerAddressPreview } from "@/modules/omniston/demo/components/ExplorerAddressPreview";
import { DescriptionList } from "@/modules/omniston/demo/components/ui/description-list";
import { bigNumberToFloat, trimStringWithEllipsis } from "@/modules/omniston/demo/lib/utils";
import { Chain } from "@/modules/omniston/demo/models/chain";
import { useQuoteAssets } from "@/modules/omniston/demo/hooks/useQuoteAssets";

export function QuotePresenter({
  quote,
  ...props
}: React.ComponentProps<typeof DescriptionList> & {
  quote: Quote;
}) {
  const quoteAssets = useQuoteAssets(quote);

  if (!quoteAssets) {
    return null;
  }

  const { inputAsset, inputNativeAsset, outputAsset, outputNativeAsset } = quoteAssets;

  const {
    rfqId,
    quoteId,
    resolverId,
    resolverName,
    inputUnits,
    outputUnits,
    protocolFeeUnits,
    estimatedGasConsumption,
    gasBudget,
    integratorFeeUnits,
    integratorAddress,
    ...rest
  } = quote;

  return (
    <DescriptionList {...props}>
      <li>
        <span>Resolved by:</span>
        <ExplorerAddressPreview
          address={{
            chain: {
              $case: Chain.TON,
              value: resolverId,
            },
          }}
        >
          {resolverName}
        </ExplorerAddressPreview>
      </li>
      <li>
        <span>Input amount:</span>
        <span>
          {`${bigNumberToFloat(inputUnits, inputAsset.metadata.decimals)} ${inputAsset.metadata.symbol}`}
        </span>
      </li>
      <li>
        <span>Output amount:</span>
        <span>
          {`${bigNumberToFloat(outputUnits, outputAsset.metadata.decimals)} ${outputAsset.metadata.symbol}`}
        </span>
      </li>
      <li>
        <span>Protocol fee:</span>
        <span>
          {`${bigNumberToFloat(protocolFeeUnits, outputAsset.metadata.decimals)} ${outputAsset.metadata.symbol}`}
        </span>
      </li>
      {integratorAddress ? (
        <>
          <li>
            <span>Integrator fee address:</span>
            <ExplorerAddressPreview address={integratorAddress}>
              {trimStringWithEllipsis(integratorAddress.chain.value, 6)}
            </ExplorerAddressPreview>
          </li>
          <li>
            <span>Integrator fee:</span>
            <span>
              {`${bigNumberToFloat(integratorFeeUnits, outputAsset.metadata.decimals)} ${outputAsset.metadata.symbol}`}
            </span>
          </li>
        </>
      ) : null}
      {gasBudget ? (
        <li>
          <span>Gas budget:</span>
          <span>{`${bigNumberToFloat(gasBudget, inputNativeAsset.metadata.decimals)} ${inputNativeAsset.metadata.symbol}`}</span>
        </li>
      ) : null}
      {estimatedGasConsumption ? (
        <li>
          <span>Estimated gas consumption:</span>
          <span>{`${bigNumberToFloat(estimatedGasConsumption, inputNativeAsset.metadata.decimals)} ${inputNativeAsset.metadata.symbol}`}</span>
        </li>
      ) : null}
    </DescriptionList>
  );
}
