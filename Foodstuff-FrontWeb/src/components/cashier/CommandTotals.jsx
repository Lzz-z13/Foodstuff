import { moeda } from "./format";

export default function CommandTotals({ command }) {
  return (
    <div className="mt-auto space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
      <div className="flex justify-between gap-3 text-slate-500">
        <span>Subtotal Consumo</span>
        <span className="text-slate-900">{moeda(command.subtotal)}</span>
      </div>
      <div className="flex justify-between gap-3 text-slate-500">
        <span>Taxa de Serviço ({command.service_fee_percent}%)</span>
        <span className="text-slate-900">{moeda(command.service_fee)}</span>
      </div>
      <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 font-bold">
        <span>Total Geral</span>
        <strong className="text-xl text-[#ff5f38]">
          {moeda(command.total)}
        </strong>
      </div>
      {Number(command.paid) > 0 && (
        <>
          <div className="flex justify-between text-slate-500">
            <span>Já pago</span>
            <span>{moeda(command.paid)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Saldo a pagar</span>
            <span>{moeda(command.balance)}</span>
          </div>
        </>
      )}
    </div>
  );
}
