import { useEffect, useRef, useState } from "react";
import { Copy, LoaderCircle, QrCode, ShieldCheck, X } from "lucide-react";
import api from "../../services/axios";
import { botao, moeda, numeroComanda } from "./format";

export default function PixPaymentModal({ initialPayment, onPaid, onClose }) {
  const dialog = useRef(null);
  const codeInput = useRef(null);
  const [payment, setPayment] = useState(initialPayment);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function check() {
      try {
        const response = await api.getPixPayment(initialPayment.payment_id, {
          signal: controller.signal,
          timeout: 15000,
        });
        if (controller.signal.aborted) return;
        const current = response.data.data;
        setPayment(current);
        setError("");
        if (current.status === "PAID") {
          onPaid(current);
          return;
        }
        if (current.status === "CANCELLED") return;
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e?.response?.data?.message || "Não foi possível consultar o Pix. Tentaremos novamente automaticamente.");
      }
      timer = setTimeout(check, 5000);
    }
    check();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [initialPayment.payment_id, onPaid, attempt]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(payment.qr_code);
      setCopyMessage("Código Pix copiado!");
    } catch {
      codeInput.current?.focus();
      codeInput.current?.select();
      setCopyMessage("Selecione e copie o código do campo acima.");
    }
  }

  const cancelled = payment.status === "CANCELLED";
  const paid = payment.status === "PAID";
  return (
    <dialog
      ref={dialog}
      aria-labelledby="pix-title"
      aria-describedby="pix-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm"
    >
      <div className="relative bg-[#fff0ec] px-6 pb-5 pt-6 text-center">
        <button type="button" onClick={onClose} aria-label="Fechar Pix" className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-white focus-visible:outline-2">
          <X size={20} />
        </button>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#ff5f38] shadow-sm"><QrCode size={26} /></div>
        <h2 id="pix-title" className="text-xl font-extrabold">Pague com Pix</h2>
        <p className="mt-1 text-xs text-slate-500">Comanda {numeroComanda(payment.command_id)} · Mercado Pago</p>
        <p className="mt-3 text-4xl font-extrabold text-[#ff5f38]">{moeda(payment.value)}</p>
        <p className="mt-1 text-xs text-slate-500">Valor deste pagamento</p>
      </div>
      <div className="space-y-4 p-6 text-center">
        <p id="pix-description" className="text-sm text-slate-600">
          {cancelled ? "Esta cobrança foi encerrada. Volte à comanda para iniciar um novo pagamento." : "Abra o aplicativo do seu banco, escolha pagar com Pix e escaneie o QR Code."}
        </p>
        {!cancelled && !paid && (
          <>
            <div className="mx-auto flex min-h-60 w-60 max-w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-3">
              {payment.qr_code_base64 && !imageFailed ? (
                <img src={`data:image/png;base64,${payment.qr_code_base64.replace(/^data:image\/png;base64,/, "")}`} alt={`QR Code Pix de ${moeda(payment.value)} para a comanda ${numeroComanda(payment.command_id)}`} onError={() => setImageFailed(true)} className="aspect-square w-full" />
              ) : (
                <p role="status" className="p-4 text-sm text-slate-500">{imageFailed ? "Imagem indisponível. Utilize o Pix Copia e Cola abaixo." : "Aguardando o QR Code do Mercado Pago…"}</p>
              )}
            </div>
            {payment.qr_code && (
              <div className="space-y-2 text-left">
                <label htmlFor="pix-code" className="text-xs font-semibold text-slate-500">Pix Copia e Cola</label>
                <input ref={codeInput} id="pix-code" readOnly value={payment.qr_code} onFocus={(event) => event.target.select()} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600" />
                <button type="button" onClick={copyCode} className={`${botao} w-full`}><Copy size={16} />Copiar código Pix</button>
                <p role="status" className="text-center text-xs text-emerald-700">{copyMessage}</p>
              </div>
            )}
          </>
        )}
        <div role="status" className={`flex items-center justify-center gap-2 rounded-xl p-3 text-xs font-semibold ${cancelled ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
          {cancelled ? "Cobrança encerrada sem pagamento" : paid ? <><ShieldCheck size={16} />Pix confirmado!</> : <><LoaderCircle size={16} className="animate-spin" />Aguardando pagamento…</>}
        </div>
        {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700"><p>{error}</p><button type="button" onClick={() => setAttempt((v) => v + 1)} className="mt-2 underline">Consultar novamente</button></div>}
        {!cancelled && !paid && <p className="text-xs leading-relaxed text-slate-500">A confirmação é automática. Fechar esta janela mantém a cobrança disponível para consulta na comanda.</p>}
        <button type="button" onClick={onClose} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Voltar à comanda</button>
      </div>
    </dialog>
  );
}
