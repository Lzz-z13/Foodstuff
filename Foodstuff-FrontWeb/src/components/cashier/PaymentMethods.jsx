import { Banknote, CreditCard, QrCode, Ticket } from "lucide-react";

const METHODS = [
  { value: "PIX", label: "PIX", icon: QrCode },
  { value: "CREDIT_CARD", label: "Crédito", icon: CreditCard },
  { value: "DEBIT_CARD", label: "Débito", icon: CreditCard },
  { value: "VOUCHER", label: "Vale Refeição", icon: Ticket },
  { value: "CASH", label: "Dinheiro", icon: Banknote },
];

export default function PaymentMethods({ value, onChange, disabled }) {
  return (
    <fieldset disabled={disabled} className="border-b border-slate-200 pb-5">
      <legend className="mb-3 text-sm font-bold">
        Selecione o Método de Pagamento
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {METHODS.map(({ value: method, label, icon: Icon }) => (
          <button
            type="button"
            key={method}
            onClick={() => onChange(method)}
            aria-pressed={value === method}
            className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-1 text-[10px] font-semibold disabled:cursor-not-allowed ${value === method ? "border-[#ff5f38] bg-[#fff0ec] text-[#ff5f38]" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400"}`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
