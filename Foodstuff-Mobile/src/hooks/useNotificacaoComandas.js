import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";

const INTERVALO_PADRAO = 10000;

// As telas entregam as mesas em formatos diferentes (admin usa id/numero e o
// garçom usa table_id/number). Deixamos tudo no mesmo formato e descartamos
// mesas locais (ids tipo "local-1"), que não existem na API.
function normalizarMesas(mesas) {
  if (!Array.isArray(mesas)) {
    return [];
  }

  const vistas = new Set();
  const normalizadas = [];

  mesas.forEach((mesa) => {
    const tableId = Number(mesa?.table_id ?? mesa?.id);

    if (!Number.isFinite(tableId) || tableId <= 0 || vistas.has(tableId)) {
      return;
    }

    vistas.add(tableId);
    normalizadas.push({
      tableId,
      numero: Number(mesa?.number ?? mesa?.numero),
    });
  });

  return normalizadas;
}

export default function useNotificacaoComandas(
  mesas,
  { intervalo = INTERVALO_PADRAO } = {},
) {
  const [notificacao, setNotificacao] = useState(null);

  const mesasRef = useRef(mesas);
  // null = ainda não fizemos a primeira leitura. A primeira leitura serve
  // apenas de base, para não notificar comandas que já estavam abertas.
  const comandosConhecidosRef = useRef(null);
  const verificandoRef = useRef(false);

  useEffect(() => {
    mesasRef.current = mesas;
  }, [mesas]);

  const verificar = useCallback(async () => {
    if (verificandoRef.current) {
      return;
    }

    const mesasNormalizadas = normalizarMesas(mesasRef.current);

    if (mesasNormalizadas.length === 0) {
      return;
    }

    verificandoRef.current = true;

    try {
      const resultados = await Promise.all(
        mesasNormalizadas.map(async ({ tableId, numero }) => {
          try {
            const resposta = await api.getTableCommands(tableId);
            const comandos = Array.isArray(resposta?.data?.data)
              ? resposta.data.data
              : [];

            return { numero, comandos };
          } catch (error) {
            return { numero, comandos: [] };
          }
        }),
      );

      const abertas = [];

      resultados.forEach(({ numero, comandos }) => {
        comandos.forEach((comanda) => {
          if (comanda?.status === "OPEN") {
            abertas.push({ numero, comanda });
          }
        });
      });

      const idsAtuais = new Set(
        abertas.map(({ comanda }) => comanda.command_id),
      );

      if (comandosConhecidosRef.current === null) {
        comandosConhecidosRef.current = idsAtuais;
        return;
      }

      const novas = abertas.filter(
        ({ comanda }) => !comandosConhecidosRef.current.has(comanda.command_id),
      );

      comandosConhecidosRef.current = idsAtuais;

      if (novas.length === 0) {
        return;
      }

      const primeira = novas[0];

      setNotificacao({
        id: `${primeira.comanda.command_id}-${Date.now()}`,
        mesa: primeira.numero,
        cliente: primeira.comanda.customer_name,
        total: novas.length,
      });
    } finally {
      verificandoRef.current = false;
    }
  }, []);

  const totalMesas = Array.isArray(mesas) ? mesas.length : 0;

  useEffect(() => {
    if (totalMesas === 0) {
      return undefined;
    }

    verificar();
    const intervaloId = setInterval(verificar, intervalo);

    return () => clearInterval(intervaloId);
  }, [totalMesas, intervalo, verificar]);

  const fecharNotificacao = useCallback(() => {
    setNotificacao(null);
  }, []);

  return { notificacao, fecharNotificacao, verificar };
}
