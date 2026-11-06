import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useCheckout from "../../components/cashier/useCheckout";
import ConsumedItems from "../../components/cashier/ConsumedItems";
import PaymentForm from "../../components/cashier/PaymentForm";
import Snackbar from "../../components/snackBar/SnackBar";
import { hora, moeda, numeroComanda } from "../../components/cashier/format";

export default function Pagamento() {
  const { commandId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useCheckout(commandId);
  const [message, setMessage] = useState(null);
  const [openedAt] = useState(() => Date.now());
  const back = () =>
    navigate(`/caixa?comanda=${encodeURIComponent(commandId)}`);
  if (loading)
    return (
      <p role="status" className="p-12 text-center text-sm text-slate-500">
        Carregando pagamento...
      </p>
    );
  if (error)
    return (
      <div
        role="alert"
        className="rounded-xl bg-white p-6 text-sm text-red-600"
      >
        <p>{error}</p>
        <button type="button" onClick={reload} className="mr-4 mt-3 underline">
          Tentar novamente
        </button>
        <button type="button" onClick={back} className="underline">
          Voltar
        </button>
      </div>
    );
  if (!data) return null;
  const minutes = Math.max(
    0,
    Math.floor(
      (new Date(data.closed_at || openedAt) - new Date(data.opened_at)) / 60000,
    ),
  );
  return (
    <div>
      {message && (
        <Snackbar
          isOpen
          message={message}
          type="success"
          onClose={() => setMessage(null)}
        />
      )}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Voltar às comandas"
            onClick={back}
            className="rounded-lg border border-slate-200 bg-white p-2"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold">
                Pagamento • Comanda {numeroComanda(commandId)}
              </h1>
              <span className="rounded bg-[#fff0ec] px-2 py-0.5 text-[11px] font-bold text-[#ff5f38]">
                Mesa {data.table_number}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {data.waiter_name
                ? `Garçom: ${data.waiter_name}`
                : data.customer_name}{" "}
              • Entrada: {hora(data.opened_at)} • Permanência: {minutes} min
            </p>
          </div>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] uppercase tracking-wider text-slate-400">
            Total a pagar
          </p>
          <strong className="text-2xl font-extrabold text-[#ff5f38]">
            {moeda(data.balance)}
          </strong>
        </div>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ConsumedItems command={data} />
        <PaymentForm
          key={`${commandId}-${data.balance}`}
          command={data}
          onCancel={back}
          onRefresh={reload}
          onSuccess={(payment) => {
            setMessage(
              payment.status === "PAID"
                ? `Pagamento confirmado. Comanda quitada.${payment.change > 0 ? ` Troco: ${moeda(payment.change)}` : ""}`
                : "Pagamento registrado. Confirme o restante da conta.",
            );
            reload();
          }}
        />
      </div>
    </div>
  );
}
