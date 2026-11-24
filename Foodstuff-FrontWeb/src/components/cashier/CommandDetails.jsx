import { Link } from "react-router-dom";
import { Printer, Wallet } from "lucide-react";
import useCheckout from "./useCheckout";
import CommandTotals from "./CommandTotals";
import { botao, moeda, numeroComanda, painel } from "./format";

export default function CommandDetails({ commandId, onTotalsChanged }) {
  const {
    data,
    error,
    loading,
    reload,
    setServiceFee,
    savingServiceFee,
    serviceFeeError,
  } = useCheckout(commandId);
  if (!commandId)
    return (
      <section
        className={`${painel} flex min-h-96 items-center justify-center text-sm text-slate-400`}
      >
        Selecione uma comanda para ver os detalhes.
      </section>
    );
  if (loading)
    return (
      <section className={painel} role="status">
        Carregando comanda...
      </section>
    );
  if (error)
    return (
      <section className={painel}>
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
        <button
          type="button"
          onClick={reload}
          className="mt-3 text-sm underline"
        >
          Tentar novamente
        </button>
      </section>
    );
  return (
    <section
      className={`${painel} cashier-receipt flex min-h-[580px] flex-col gap-5`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold">
            Detalhamento • Comanda {numeroComanda(data.command_id)}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Mesa {data.table_number} •{" "}
            {data.waiter_name
              ? `Garçom: ${data.waiter_name}`
              : "Aberta pelo cliente"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{data.customer_name}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 print:hidden cursor-pointer"
        >
          <Printer size={14}/>
          Pré-conta
        </button>
      </div>
      <div>
        <h3 className="mb-3 text-[10px] font-bold uppercase text-slate-400">
          Consumo registrado
        </h3>
        <ul className="divide-y divide-slate-100">
          {data.items.map((item) => (
            <li
              key={item.order_item_id}
              className="flex justify-between gap-4 py-2.5 text-sm"
            >
              <span>
                {item.quantity}x {item.product_name}
              </span>
              <strong className="shrink-0">{moeda(item.subtotal)}</strong>
            </li>
          ))}
        </ul>
        {!data.items.length && (
          <p className="py-8 text-sm text-slate-400">
            Nenhum consumo registrado.
          </p>
        )}
      </div>
      <CommandTotals
        command={data}
        togglingServiceFee={savingServiceFee}
        serviceFeeError={serviceFeeError}
        onToggleServiceFee={async (apply) => {
          await setServiceFee(apply);
          onTotalsChanged?.();
        }}
      />
      {["OPEN", "CLOSED"].includes(data.status) && data.balance > 0 ? (
        <Link
          to={`/caixa/comandas/${data.command_id}/pagamento`}
          className={`${botao} print:hidden`}
        >
          <Wallet size={17} />
          Ir para Pagamento
        </Link>
      ) : (
        <p className="text-center text-sm text-slate-500">
          {data.status === "PAID"
            ? "Comanda paga."
            : "Sem saldo disponível para pagamento."}
        </p>
      )}
    </section>
  );
}
