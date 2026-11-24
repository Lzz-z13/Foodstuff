import { useEffect, useState } from "react";
import api from "../../services/axios";

export default function useCheckout(commandId) {
  const [result, setResult] = useState(null);
  const [version, setVersion] = useState(0);
  const [savingServiceFee, setSavingServiceFee] = useState(false);
  const [serviceFeeError, setServiceFeeError] = useState("");
  useEffect(() => {
    if (!commandId) return;
    const controller = new AbortController();
    api
      .getCommandCheckout(commandId, { signal: controller.signal })
      .then((response) =>
        setResult({ id: String(commandId), data: response.data.data, version }),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            id: String(commandId),
            error:
              error?.response?.data?.message ||
              "Não foi possível carregar a comanda.",
            version,
          });
      });
    return () => controller.abort();
  }, [commandId, version]);
  async function setServiceFee(apply) {
    if (!commandId || savingServiceFee) return;
    setSavingServiceFee(true);
    setServiceFeeError("");
    try {
      await api.patchCommandServiceFee(commandId, apply);
      setVersion((v) => v + 1);
    } catch (error) {
      setServiceFeeError(
        error?.response?.data?.message ||
          "Não foi possível atualizar a taxa de serviço.",
      );
    } finally {
      setSavingServiceFee(false);
    }
  }
  const current =
    result?.id === String(commandId) && result?.version === version
      ? result
      : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: Boolean(commandId) && !current,
    reload: () => setVersion((v) => v + 1),
    setServiceFee,
    savingServiceFee,
    serviceFeeError,
  };
}
