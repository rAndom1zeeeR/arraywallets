import { AccountEvent, Action } from '@ton-api/client';
import { Address, fromNano } from '@ton/core';
import { TONAPI_CLIENT } from '@/shared/api/tonapi-client';
import { fromUnits } from '@/shared/lib/units';


export default async function Home() {
  let eventsData: AccountEvent[] = [];
  let error: string | null = null;

  try {
    const address = Address.parse('EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl');
    const events = await TONAPI_CLIENT.accounts.getAccountEvents(address, { limit: 50 });
    eventsData = events.events;
    console.log('Account events:', eventsData[38]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    console.error('TON API Error:', err);
  }

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">TON Wallet Transactions</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {eventsData.length === 0 && !error && (
        <p>No events found.</p>
      )}

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
          {eventsData.map((event, index) => (
            <tr key={event.eventId} className="border border-gray-300">
              <td>{index}</td>
              <td>{new Date(event.timestamp * 1000).toLocaleString()}</td>
              <td>{event.actions?.map((action: Action, index: number) => (
                <div key={index}>
                  {action.TonTransfer?.sender && <p className="text-green-300">{action.TonTransfer?.sender?.address.toString()}</p>}
                  {action.TonTransfer?.recipient && <p className="text-green-500">{action.TonTransfer?.recipient?.address.toString()}</p>}
                  {action.JettonTransfer?.sender && <p className="text-red-300">{action.JettonTransfer?.sender?.address.toString()}</p>}
                  {action.JettonTransfer?.recipient && <p className="text-red-500">{action.JettonTransfer?.recipient?.address.toString()}</p>}
                  {action.JettonSwap?.userWallet && <p className="text-yellow-500">{action.JettonSwap?.userWallet?.address.toString()}</p>}
                  {action.JettonSwap?.router && <p className="text-yellow-300">{action.JettonSwap?.router?.address.toString()}</p>}
                  {action.FlawedJettonTransfer?.recipients_wallet && <p className="text-blue-500">{action.FlawedJettonTransfer?.recipients_wallet}</p>}
                  {action.FlawedJettonTransfer?.senders_wallet && <p className="text-blue-300">{action.FlawedJettonTransfer?.senders_wallet}</p>}
                </div>
              ))}</td>
              <td>{event.actions?.map(action => action.type).join(', ')}</td>
              <td>{event.actions?.map((action: Action, index: number) => (
                <div key={index}>
                  {action.JettonSwap?.tonIn != null &&
                    action.JettonSwap?.tonIn > 0n &&
                    action.JettonSwap?.amountOut != null &&
                    action.JettonSwap?.amountOut > 0n && <p className="text-green-500">-{fromNano(action.JettonSwap?.tonIn)} TON +{fromUnits(action.JettonSwap?.amountOut, action.JettonSwap?.jettonMasterOut?.decimals ?? 9)} {action.JettonSwap?.jettonMasterOut?.name}</p>}
                  {action.JettonSwap?.amountIn != null &&
                    action.JettonSwap.amountIn > 0n &&
                    action.JettonSwap.tonOut != null &&
                    action.JettonSwap.tonOut > 0n && <p className="text-red-500">-{fromUnits(action.JettonSwap?.amountIn, action.JettonSwap?.jettonMasterIn?.decimals ?? 9)} {action.JettonSwap?.jettonMasterIn?.name} +{fromNano(action.JettonSwap?.tonOut)} TON</p>}
                  {action.JettonTransfer?.amount != null && action.JettonTransfer?.amount > 0n && <p className="text-blue-500">{action.JettonTransfer?.recipient?.address.toRawString() === event.account.address.toRawString() ? '+' : '-'}{fromUnits(action.JettonTransfer?.amount, action.JettonTransfer?.jetton?.decimals ?? 9)} {action.JettonTransfer?.jetton?.name}</p>}
                  {action.TonTransfer?.amount != null && action.TonTransfer?.amount > 0n && <p className="text-yellow-500">{action.TonTransfer?.recipient.address.toRawString() === event.account.address.toRawString() ? '+' : '-'}{fromNano(action.TonTransfer?.amount)} TON</p>}
                  {action.SmartContractExec?.tonAttached != null && action.SmartContractExec?.tonAttached > 0n && <p className="text-purple-500">{action.SmartContractExec?.executor.address.toRawString() === event.account.address.toRawString() ? '+' : '-'}{fromNano(action.SmartContractExec?.tonAttached)} TON</p>}
                  {action.JettonSwap?.amountIn > 0 && fromUnits(action.JettonSwap?.amountIn, action.JettonSwap?.jettonMasterIn?.decimals ?? 9)} {action.JettonSwap?.jettonMasterIn?.name}
                  {action.FlawedJettonTransfer?.received_amount && <p className="text-blue-500">+{fromUnits(action.FlawedJettonTransfer?.received_amount, action.FlawedJettonTransfer?.jetton?.decimals ?? 9)} {action.FlawedJettonTransfer?.jetton?.name}</p>}
                  {action.FlawedJettonTransfer?.sent_amount && <p className="text-blue-300">-{fromUnits(action.FlawedJettonTransfer?.sent_amount, action.FlawedJettonTransfer?.jetton?.decimals ?? 9)} {action.FlawedJettonTransfer?.jetton?.name}</p>}
                </div>
              ))}
              </td>
              <td>
                {event.actions?.map((action: Action, index: number) => (
                  <div key={index}>
                    {action.JettonTransfer?.comment && <p>{action.JettonTransfer?.comment}</p>}
                    {action.FlawedJettonTransfer?.comment && <p>{action.FlawedJettonTransfer?.comment}</p>}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
