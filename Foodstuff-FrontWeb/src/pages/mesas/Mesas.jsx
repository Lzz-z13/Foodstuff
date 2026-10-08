import { useEffect, useState } from "react";
import { Clock, Loader2, MoreVertical, Plus, Table2, Trash2, Users } from "lucide-react";

import Snackbar from "../../components/snackBar/SnackBar";
import api from "../../services/axios";

const STATUS_STYLE = {
  livre: {
    badge: "bg-green-100 text-green-700",
    borda: "border-green-200 hover:border-green-300",
    icone: "bg-green-50 text-green-600",
    label: "Livre",
  },
  ocupada: {
    badge: "bg-red-100 text-red-600",
    borda: "border-red-200 hover:border-red-300",
    icone: "bg-red-50 text-red-500",
    label: "Ocupada",
  },
  reservada: {
    badge: "bg-amber-100 text-amber-700",
    borda: "border-amber-200 hover:border-amber-300",
    icone: "bg-amber-50 text-amber-600",
    label: "Reservada",
  },
};

const FILTROS = [
  { id: "todas", label: "Todas" },
  { id: "livre", label: "Livres" },
  { id: "ocupada", label: "Ocupadas" },
  { id: "reservada", label: "Reservadas" },
];

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "null") ?? {};
  } catch {
    return {};
  }
}

function isManagerRole(role) {
  return role === "MANAGER" || role === "MANAGERS";
}

function getTablesFromResponse(response) {
  const data = response?.data?.data ?? response?.data;

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((table) => ({
      id: table.table_id ?? table.id,
      numero: table.number,
      status: table.status ?? "livre",
      pedido: table.pedido ?? null,
      tempo: table.tempo ?? null,
    }))
    .filter((table) => table.id && table.numero)
    .sort((a, b) => Number(a.numero) - Number(b.numero));
}

function getApiMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

export default function Mesas() {
  const user = getStoredUser();
  const isManager = isManagerRole(user.role);

  const [filtro, setFiltro] = useState("todas");
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(isManager);
  const [salvando, setSalvando] = useState(false);
  const [deletandoId, setDeletandoId] = useState(null);
  const [mesaAbertaId, setMesaAbertaId] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  useEffect(() => {
    if (!isManager) {
      return;
    }

    let mounted = true;

    async function carregarMesas() {
      try {
        setLoading(true);
        const response = await api.getAllTables();

        if (mounted) {
          setMesas(getTablesFromResponse(response));
        }
      } catch (error) {
        if (mounted) {
          setSnackbar({
            message: getApiMessage(error, "Erro ao buscar mesas."),
            type: "error",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    carregarMesas();

    return () => {
      mounted = false;
    };
  }, [isManager]);

  const mesasFiltradas =
    filtro === "todas"
      ? mesas
      : mesas.filter((m) => m.status === filtro);

  const totalMesas = mesas.length;
  const mesasOcupadas = mesas.filter(
    (m) => m.status === "ocupada",
  ).length;
  const mesasLivres = mesas.filter((m) => m.status === "livre").length;

  const temposMin = mesas.map((m) => {
    const match =
      typeof m.tempo === "string" ? m.tempo.match(/(\d+)\s*min/) : null;
    return match ? Number(match[1]) : null;
  }).filter((n) => n !== null);
  const tempoMedio =
    temposMin.length > 0
      ? `${Math.round(temposMin.reduce((soma, n) => soma + n, 0) / temposMin.length)} min`
      : "—";

  async function handleCriarMesa() {
    if (!isManager) {
      setSnackbar({
        message: "Apenas gerentes podem criar mesas.",
        type: "warning",
      });
      return;
    }

    const numero = mesas.length + 1;

    try {
      setSalvando(true);
      const response = await api.postTable({ number: numero });
      const id = response?.data?.data?.table_id;

      setMesas((mesasAtuais) =>
        [
          ...mesasAtuais.filter((mesa) => Number(mesa.numero) !== numero),
          {
            id,
            numero,
            status: "livre",
            pedido: null,
            tempo: null,
          },
        ].sort((a, b) => Number(a.numero) - Number(b.numero)),
      );
      setSnackbar({
        message: response?.data?.message || "Mesa criada com sucesso.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao criar mesa."),
        type: "error",
      });
    } finally {
      setSalvando(false);
    }
  }

  async function handleDeletarMesa(mesa) {
    if (!isManager) {
      setSnackbar({
        message: "Apenas gerentes podem excluir mesas.",
        type: "warning",
      });
      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente excluir a mesa ${mesa.numero}?`,
    );

    if (!confirmar) {
      return;
    }

    try {
      setDeletandoId(mesa.id);
      const response = await api.deleteTable(mesa.id);

      setMesas((mesasAtuais) =>
        mesasAtuais.filter((mesaAtual) => mesaAtual.id !== mesa.id),
      );
      setMesaAbertaId(null);
      setSnackbar({
        message: response?.data?.message || "Mesa excluída com sucesso.",
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message: getApiMessage(error, "Erro ao excluir mesa."),
        type: "error",
      });
    } finally {
      setDeletandoId(null);
    }
  }

  return (
    <div className="min-h-full">
      {snackbar && (
        <Snackbar
          isOpen={true}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}

      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Mesas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Toque em uma mesa para ver detalhes
          </p>
        </div>

        <button
          type="button"
          onClick={handleCriarMesa}
          disabled={!isManager || salvando || loading}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#ff5a47] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          {salvando ? "Criando..." : "Nova mesa"}
        </button>
      </div>

      {!isManager && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
          Acesso restrito. Apenas gerentes podem visualizar, criar e excluir mesas.
        </div>
      )}

      {/* RESUMO */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Table2 size={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">Total de Mesas</p>
            <p className="text-xl font-bold text-slate-900">{totalMesas}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <Users size={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">Mesas Ocupadas</p>
            <p className="text-xl font-bold text-slate-900">{mesasOcupadas}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <Table2 size={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">Mesas Livres</p>
            <p className="text-xl font-bold text-slate-900">{mesasLivres}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock size={20} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-500">Tempo Médio</p>
            <p className="text-xl font-bold text-slate-900">{tempoMedio}</p>
          </div>
        </div>
      </div>

      {/* LEGENDA + FILTROS */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
              filtro === f.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}

        <div className="ml-auto hidden items-center gap-3 text-[11px] font-medium text-slate-500 lg:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Ocupada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Reservada
          </span>
        </div>
      </div>

      {/* GRID DE MESAS */}
      <div className="mt-5">
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Buscando mesas...
          </div>
        ) : mesasFiltradas.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
            <p className="text-sm text-slate-400">
              Nenhuma mesa com esse status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {mesasFiltradas.map((mesa) => {
              const estilo = STATUS_STYLE[mesa.status] ?? STATUS_STYLE.livre;

              return (
                <div
                  key={mesa.id}
                  className={`relative rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${estilo.borda}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setMesaAbertaId((mesaId) =>
                        mesaId === mesa.id ? null : mesa.id,
                      )
                    }
                    className="w-full cursor-pointer text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        Mesa {mesa.numero}
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${estilo.badge}`}
                        >
                          {estilo.label}
                        </span>
                        <MoreVertical size={16} className="text-slate-400" />
                      </div>
                    </div>

                    <div
                      className={`mt-3 flex h-16 items-center justify-center rounded-xl ${estilo.icone}`}
                    >
                      <Table2 size={28} />
                    </div>

                    <div className="mt-3 text-[11px] text-slate-500">
                      {mesa.status === "livre" ? (
                        <p>Disponível</p>
                      ) : (
                        <>
                          {mesa.pedido && (
                            <p className="font-semibold text-slate-700">
                              Pedido {mesa.pedido}
                            </p>
                          )}
                          {mesa.tempo && <p>{mesa.tempo}</p>}
                        </>
                      )}
                    </div>
                  </button>

                  {mesaAbertaId === mesa.id && (
                    <div className="absolute right-3 top-12 z-20 w-40 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
                      <button
                        type="button"
                        disabled={deletandoId === mesa.id || !isManager}
                        onClick={() => handleDeletarMesa(mesa)}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletandoId === mesa.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                        Excluir mesa
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
