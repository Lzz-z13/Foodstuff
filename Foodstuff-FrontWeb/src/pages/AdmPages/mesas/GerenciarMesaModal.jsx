import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Printer, QrCode, RefreshCw, X } from "lucide-react";

import api from "../../../services/axios";
import { textToQrCodeDataUrl } from "../../../utils/qrCode";

// O QR Code aponta para o deep link do aplicativo mobile, que abre o
// cardápio do cliente já vinculado a esta mesa.
function montarLinkMesa(token) {
  return `foodstuff://mesa/${token}`;
}

function getQrCodesFromResponse(response) {
  const data = response?.data?.data ?? response?.data;

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((qr) => qr.is_active)
    .map((qr) => ({
      id: qr.qr_code_id,
      token: qr.token,
    }))
    .filter((qr) => qr.id && qr.token);
}

function getApiMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export default function GerenciarMesaModal({ mesa, onClose }) {
  const [qrCodes, setQrCodes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [regenerandoId, setRegenerandoId] = useState(null);
  const [erroCarregamento, setErroCarregamento] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [imprimindoId, setImprimindoId] = useState(null);

  const montadoRef = useRef(true);

  // Em StrictMode o React executa o cleanup e roda o efeito de novo
  // com o componente ainda montado, por isso o valor precisa ser
  // restaurado no corpo do efeito.
  useEffect(() => {
    montadoRef.current = true;

    return () => {
      montadoRef.current = false;
    };
  }, []);

  const carregarQrCodes = useCallback(
    async (mostrarCarregando = true) => {
      if (mostrarCarregando && montadoRef.current) {
        setCarregando(true);
      }

      try {
        const response = await api.getQrCodesByTable(mesa.id);

        if (montadoRef.current) {
          setQrCodes(getQrCodesFromResponse(response));
          setErroCarregamento(null);
        }

        return true;
      } catch (error) {
        if (montadoRef.current) {
          setQrCodes([]);
          setErroCarregamento(
            getApiMessage(error, "Erro ao buscar os QR Codes da mesa."),
          );
        }

        return false;
      } finally {
        if (montadoRef.current) {
          setCarregando(false);
        }
      }
    },
    [mesa.id],
  );

  useEffect(() => {
    carregarQrCodes();
  }, [carregarQrCodes]);

  // Converte o token de cada QR Code ativo em uma imagem PNG.
  const imagensQr = useMemo(() => {
    const imagens = new Map();

    for (const qr of qrCodes) {
      try {
        imagens.set(qr.id, textToQrCodeDataUrl(montarLinkMesa(qr.token)));
      } catch {
        // Tokens que não puderam ser codificados não geram imagem.
      }
    }

    return imagens;
  }, [qrCodes]);

  const qrEmImpressao =
    qrCodes.find((qr) => qr.id === imprimindoId && imagensQr.has(qr.id)) ??
    null;

  useEffect(() => {
    if (!imprimindoId) {
      return;
    }

    function limparImpressao() {
      setImprimindoId(null);
    }

    // A área de impressão já está no DOM quando este efeito roda.
    window.addEventListener("afterprint", limparImpressao);
    window.print();

    return () => {
      window.removeEventListener("afterprint", limparImpressao);
    };
  }, [imprimindoId]);

  async function handleGerarQrCode() {
    try {
      setGerando(true);
      const response = await api.postQrCode(mesa.id, { position: 1 });
      const recarregou = await carregarQrCodes(false);

      if (recarregou && montadoRef.current) {
        setFeedback({
          type: "success",
          message: response?.data?.message || "QR Code criado com sucesso.",
        });
      }
    } catch (error) {
      if (montadoRef.current) {
        setFeedback({
          type: "error",
          message: getApiMessage(error, "Erro ao gerar o QR Code."),
        });
      }
    } finally {
      if (montadoRef.current) {
        setGerando(false);
      }
    }
  }

  async function handleRegenerarQrCode(qr) {
    const confirmar = window.confirm(
      "Ao regenerar, o QR Code impresso nesta mesa deixará de funcionar. Deseja continuar?",
    );

    if (!confirmar) {
      return;
    }

    try {
      setRegenerandoId(qr.id);
      const response = await api.putQrCode(mesa.id, qr.id);
      const recarregou = await carregarQrCodes(false);

      if (recarregou && montadoRef.current) {
        setFeedback({
          type: "success",
          message: response?.data?.message || "QR Code regenerado com sucesso.",
        });
      }
    } catch (error) {
      if (montadoRef.current) {
        setFeedback({
          type: "error",
          message: getApiMessage(error, "Erro ao regenerar o QR Code."),
        });
      }
    } finally {
      if (montadoRef.current) {
        setRegenerandoId(null);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <div className="mr-auto">
            <h3 className="text-[15px] font-bold text-slate-900">
              Gerenciar mesa {mesa.numero}
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Gere, imprima ou regenere o QR Code fixado nesta mesa.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto p-5">
          {feedback && (
            <p
              className={`rounded-xl border px-3 py-2 text-[12px] font-medium ${
                feedback.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {feedback.message}
            </p>
          )}

          {carregando ? (
            <div className="flex h-48 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Buscando QR Codes...
            </div>
          ) : erroCarregamento ? (
            <div className="grid gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-[12px] font-medium text-red-700">
                {erroCarregamento}
              </p>
              <button
                type="button"
                onClick={() => carregarQrCodes()}
                className="cursor-pointer justify-self-start rounded-xl border border-red-200 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
              >
                Tentar novamente
              </button>
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <QrCode size={24} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Nenhum QR Code ativo
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  Gere o QR Code e fixe a impressão na mesa {mesa.numero} para
                  os clientes abrirem o cardápio.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGerarQrCode}
                disabled={gerando}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#ff5a47] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {gerando ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <QrCode size={15} />
                )}
                {gerando ? "Gerando..." : "Gerar QR Code"}
              </button>
            </div>
          ) : (
            qrCodes.map((qr) => {
              const imagem = imagensQr.get(qr.id);

              return (
                <div
                  key={qr.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-slate-800">
                      QR Code da mesa
                    </p>
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                      Ativo
                    </span>
                  </div>

                  {imagem ? (
                    <img
                      src={imagem}
                      alt={`QR Code da mesa ${mesa.numero}`}
                      className="mx-auto mt-3 h-52 w-52"
                    />
                  ) : (
                    <p className="mt-3 text-center text-[12px] font-medium text-red-600">
                      Não foi possível gerar a imagem deste QR Code.
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImprimindoId(qr.id)}
                      disabled={!imagem || regenerandoId === qr.id}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#ff5a47] px-3 py-2.5 text-[12px] font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Printer size={15} />
                      Imprimir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerarQrCode(qr)}
                      disabled={regenerandoId === qr.id}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {regenerandoId === qr.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <RefreshCw size={15} />
                      )}
                      {regenerandoId === qr.id
                        ? "Regenerando..."
                        : "Regenerar QR Code"}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Área oculta usada apenas pela impressão do QR Code */}
      {qrEmImpressao && (
        <div className="qr-print-area">
          <p className="text-3xl font-bold">Mesa {mesa.numero}</p>
          <img
            src={imagensQr.get(qrEmImpressao.id)}
            alt={`QR Code da mesa ${mesa.numero}`}
          />
          <p className="text-base">Aponte a câmera para abrir o cardápio</p>
        </div>
      )}
    </div>
  );
}
