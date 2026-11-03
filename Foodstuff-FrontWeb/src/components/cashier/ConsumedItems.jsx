import CommandTotals from "./CommandTotals";
import { moeda, painel } from "./format";

export default function ConsumedItems({ command }) {
  return (
    <section className={`${painel} flex min-h-[570px] flex-col gap-5`}>
      <h2 className="text-sm font-bold">Resumo dos Itens Consumidos</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[340px] text-left text-xs">
          <thead className="bg-slate-50 text-[11px] text-slate-500">
            <tr>
              <th className="rounded-l-lg p-3">Item</th>
              <th className="p-3 text-center">Qtd</th>
              <th className="p-3 text-right">Preço Unit.</th>
              <th className="rounded-r-lg p-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {command.items.map((item) => (
              <tr key={item.order_item_id}>
                <td className="p-3 font-semibold">{item.product_name}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="whitespace-nowrap p-3 text-right text-slate-500">
                  {moeda(item.unit_price)}
                </td>
                <td className="whitespace-nowrap p-3 text-right font-bold">
                  {moeda(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!command.items.length && (
        <p className="text-sm text-slate-400">Nenhum consumo registrado.</p>
      )}
      <CommandTotals command={command} />
    </section>
  );
}
