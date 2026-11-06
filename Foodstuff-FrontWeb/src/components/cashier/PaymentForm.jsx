import { useRef, useState } from "react";
import { Check } from "lucide-react";
import api from "../../services/axios";
import PaymentMethods from "./PaymentMethods";
import { botao, moeda, painel } from "./format";

function parseValor(value) {
  const clean = String(value).trim().replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(clean)
    ? Math.round(Number(clean) * 100)
    : NaN;
}

export default function PaymentForm({
  command,
  onSuccess,
  onCancel,
  onRefresh,
}) {
  const [method, setMethod] = useState("CASH");
  const [value, setValue] = useState(
    Number(command.balance).toFixed(2).replace(".", ","),
  );
  const [received, setReceived] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const valueCents = parseValor(value);
  const receivedCents = parseValor(received);
  const balanceCents = Math.round(Number(command.balance) * 100);
  const validValue =
    Number.isFinite(valueCents) && valueCents > 0 && valueCents <= balanceCents;
  const change =
    validValue && receivedCents >= valueCents
      ? (receivedCents - valueCents) / 100
      : null;
  const payable =
    ["OPEN", "CLOSED"].includes(command.status) && balanceCents > 0;
  const suggestions = [
    ...new Set([
      valueCents / 100,
      Math.ceil(valueCents / 1000) * 10,
      Math.ceil(valueCents / 5000) * 50,
      Math.ceil(valueCents / 10000) * 100,
    ]),
  ].filter((v) => Number.isFinite(v) && v > 0);

  async function submit(event) {
    event.preventDefault();
    if (
      submitting.current ||
      !validValue ||
      !payable ||
      (method === "CASH" && change === null)
    )
      return;
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await api.postCommandPayment(command.command_id, {
        method,
        value: valueCents / 100,
        expected_balance: command.balance,
        ...(method === "CASH" ? { received_amount: receivedCents / 100 } : {}),
      });
      onSuccess(response.data.data);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Não foi possível confirmar o pagamento. Atualize a comanda antes de tentar novamente.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${painel} flex flex-col gap-5`}>
      <PaymentMethods
        value={method}
        onChange={setMethod}
        disabled={saving || !payable}
      />
      {!payable ? (
        <p className="text-sm text-slate-500">
          Esta comanda não possui saldo disponível para pagamento.
        </p>
      ) : (
        <>
          <h2 className="text-sm font-bold">
            {method === "CASH"
              ? "Processamento de Dinheiro"
              : "Registro de Pagamento"}
          </h2>
          <label className="text-xs font-semibold text-slate-600">
            Valor deste pagamento (R$)
            <input
              required
              inputMode="decimal"
              value={value}
              disabled={saving}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 block h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
            />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">
              Saldo: {moeda(command.balance)}. Para dividir a conta, informe um
              valor menor.
            </span>
          </label>
          {method === "CASH" ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Valor Recebido (R$)
                  <input
                    required
                    inputMode="decimal"
                    placeholder="0,00"
                    value={received}
                    disabled={saving}
                    onChange={(e) => setReceived(e.target.value)}
                    className="mt-1 block h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900"
                  />
                </label>
                <div className="text-xs font-semibold text-slate-600">
                  Troco a devolver (R$)
                  <output
                    aria-live="polite"
                    className="mt-1 flex h-11 items-center rounded-lg border border-emerald-300 bg-emerald-100 px-3 text-sm font-bold text-emerald-600"
                  >
                    {change === null ? "—" : moeda(change)}
                  </output>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setReceived(amount.toFixed(2).replace(".", ","))
                    }
                    className={`rounded-lg border px-3 py-1.5 text-[11px] ${receivedCents === Math.round(amount * 100) ? "border-[#ff5f38] bg-[#fff0ec] text-[#ff5f38]" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                  >
                    {moeda(amount)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
              Confirme o recebimento no banco ou na maquininha antes de
              registrar este pagamento.
            </p>
          )}
          {!validValue && (
            <p className="text-xs text-red-600">
              Informe um valor positivo de até {moeda(command.balance)}.
            </p>
          )}
          <button
            type="submit"
            disabled={
              saving || !validValue || (method === "CASH" && change === null)
            }
            className={`${botao} mt-3`}
          >
            <Check size={18} />
            {saving ? "Confirmando..." : "Confirmar Pagamento"}
          </button>
        </>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-xs text-red-700"
        >
          <p>{error}</p>
          <button type="button" onClick={onRefresh} className="mt-2 underline cursor-pointer">
            Atualizar comanda
          </button>
        </div>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={onCancel}
        className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
      >
        {payable ? "Cancelar Transação" : "Voltar às comandas"}
      </button>
    </form>
  );
}
