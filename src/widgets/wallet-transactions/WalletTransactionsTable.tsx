import type { AccountEvent, Action } from "@ton-api/client";
import { fromNano } from "@ton/core";
import { fromUnits } from "@/shared/lib/units";

interface WalletTransactionsTableProps {
  events: AccountEvent[];
  rowOffset: number;
}

export const WalletTransactionsTable = ({ events, rowOffset }: WalletTransactionsTableProps) => {
  if (events.length === 0) {
    return <p>Нет событий на этой странице.</p>;
  }

  return (
    <table className="w-full border-collapse border border-gray-300">
      <thead>
        <tr className="border border-gray-300">
          <th>#</th>
          <th>Date</th>
          <th>Address</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Comment</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event, index) => (
          <tr key={event.eventId} className="border border-gray-300">
            <td>{rowOffset + index + 1}</td>
            <td>{new Date(event.timestamp * 1000).toLocaleString()}</td>
            <td>
              {event.actions?.map((action: Action, actionIndex: number) => (
                <div key={actionIndex}>
                  {action.JettonSwap?.userWallet && (
                    <p className="text-yellow-500">{action.JettonSwap.userWallet.address.toString()}</p>
                  )}
                  {action.JettonSwap?.router && (
                    <p className="text-yellow-300">{action.JettonSwap.router.address.toString()}</p>
                  )}
                  {action.TonTransfer?.sender && (
                    <p className="text-green-300">{action.TonTransfer.sender.address.toString()}</p>
                  )}
                  {action.TonTransfer?.recipient && (
                    <p className="text-green-500">{action.TonTransfer.recipient.address.toString()}</p>
                  )}
                  {action.JettonTransfer?.sender && (
                    <p className="text-red-300">{action.JettonTransfer.sender.address.toString()}</p>
                  )}
                  {action.JettonTransfer?.recipient && (
                    <p className="text-red-500">{action.JettonTransfer.recipient.address.toString()}</p>
                  )}
                  {action.FlawedJettonTransfer?.recipientsWallet && (
                    <p className="text-blue-500">{action.FlawedJettonTransfer.recipientsWallet.toString()}</p>
                  )}
                  {action.FlawedJettonTransfer?.sendersWallet && (
                    <p className="text-blue-300">{action.FlawedJettonTransfer.sendersWallet.toString()}</p>
                  )}
                  {action.SmartContractExec?.contract && (
                    <p className="text-red-500">{action.SmartContractExec.contract.address.toString()}</p>
                  )}
                  {action.SmartContractExec?.executor && (
                    <p className="text-red-500">{action.SmartContractExec.executor.address.toString()}</p>
                  )}
                </div>
              ))}
            </td>
            <td>{event.actions?.map((action: Action) => action.type).join(", ")}</td>
            <td>
              {event.actions?.map((action: Action, actionIndex: number) => (
                <div key={actionIndex}>
                  {action.JettonSwap?.tonIn != null &&
                    action.JettonSwap.tonIn > 0n &&
                    action.JettonSwap.amountOut != null &&
                    action.JettonSwap.amountOut > 0n && (
                      <p className="text-green-500">
                        -{fromNano(action.JettonSwap.tonIn)} TON +
                        {fromUnits(
                          action.JettonSwap.amountOut,
                          action.JettonSwap.jettonMasterOut?.decimals ?? 9,
                        )}{" "}
                        {action.JettonSwap.jettonMasterOut?.name}
                      </p>
                    )}
                  {action.JettonSwap?.amountIn != null &&
                    action.JettonSwap.amountIn > 0n &&
                    action.JettonSwap.tonOut != null &&
                    action.JettonSwap.tonOut > 0n && (
                      <p className="text-red-500">
                        -
                        {fromUnits(
                          action.JettonSwap.amountIn,
                          action.JettonSwap.jettonMasterIn?.decimals ?? 9,
                        )}{" "}
                        {action.JettonSwap.jettonMasterIn?.name} +{fromNano(action.JettonSwap.tonOut)} TON
                      </p>
                    )}
                  {action.JettonSwap?.amountIn != null &&
                    action.JettonSwap.amountIn > 0n &&
                    action.JettonSwap.jettonMasterIn != null &&
                    action.JettonSwap.jettonMasterOut != null && (
                      <p className="text-orange-500">
                        -
                        {fromUnits(
                          action.JettonSwap.amountIn,
                          action.JettonSwap.jettonMasterIn.decimals ?? 9,
                        )}{" "}
                        {action.JettonSwap.jettonMasterIn.name} +
                        {fromUnits(
                          action.JettonSwap.amountOut,
                          action.JettonSwap.jettonMasterOut.decimals ?? 9,
                        )}{" "}
                        {action.JettonSwap.jettonMasterOut.name}
                      </p>
                    )}
                  {action.JettonTransfer?.amount != null && action.JettonTransfer.amount > 0n && (
                    <p className="text-blue-500">
                      {action.JettonTransfer.recipient?.address.toString() ===
                      event.account.address.toString()
                        ? "+"
                        : "-"}
                      {fromUnits(
                        action.JettonTransfer.amount,
                        action.JettonTransfer.jetton?.decimals ?? 9,
                      )}{" "}
                      {action.JettonTransfer.jetton?.name}
                    </p>
                  )}
                  {action.TonTransfer?.amount != null && action.TonTransfer.amount > 0n && (
                    <p className="text-yellow-500">
                      {action.TonTransfer.recipient.address.toString() ===
                      event.account.address.toString()
                        ? "+"
                        : "-"}
                      {fromNano(action.TonTransfer.amount)} TON
                    </p>
                  )}
                  {action.SmartContractExec?.tonAttached != null &&
                    action.SmartContractExec.tonAttached > 0n && (
                      <p className="text-purple-500">
                        {action.SmartContractExec.executor.address.toString() !==
                        event.account.address.toString()
                          ? "+"
                          : "-"}
                        {fromNano(action.SmartContractExec.tonAttached)} TON
                      </p>
                    )}
                  {action.FlawedJettonTransfer?.receivedAmount && (
                    <p className="text-lime-500">
                      +
                      {fromUnits(
                        action.FlawedJettonTransfer.receivedAmount,
                        action.FlawedJettonTransfer.jetton?.decimals ?? 9,
                      )}{" "}
                      {action.FlawedJettonTransfer.jetton?.name}
                    </p>
                  )}
                  {action.FlawedJettonTransfer?.sentAmount && (
                    <p className="text-lime-500">
                      -
                      {fromUnits(
                        action.FlawedJettonTransfer.sentAmount,
                        action.FlawedJettonTransfer.jetton?.decimals ?? 9,
                      )}{" "}
                      {action.FlawedJettonTransfer.jetton?.name}
                    </p>
                  )}
                </div>
              ))}
            </td>
            <td>
              {event.actions?.map((action: Action, actionIndex: number) => (
                <div key={actionIndex}>
                  {action.TonTransfer?.comment && <p>{action.TonTransfer.comment}</p>}
                  {action.JettonTransfer?.comment && <p>{action.JettonTransfer.comment}</p>}
                  {action.FlawedJettonTransfer?.comment && (
                    <p>{action.FlawedJettonTransfer.comment}</p>
                  )}
                  {action.SmartContractExec?.operation && (
                    <p className="text-red-500">{action.SmartContractExec.operation}</p>
                  )}
                </div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
