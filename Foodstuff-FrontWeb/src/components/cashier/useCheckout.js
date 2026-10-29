import { useEffect, useState } from "react";
import api from "../../services/axios";

export default function useCheckout(commandId) {
  const [result, setResult] = useState(null);
  const [version, setVersion] = useState(0);
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
  const current =
    result?.id === String(commandId) && result?.version === version
      ? result
      : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: Boolean(commandId) && !current,
    reload: () => setVersion((v) => v + 1),
  };
}
