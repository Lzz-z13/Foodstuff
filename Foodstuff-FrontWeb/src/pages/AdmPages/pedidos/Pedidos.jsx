import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChartColumn,
  CircleDollarSign,
  Clock3,
  ReceiptText,
  Search,
  X,
} from "lucide-react";

import api from "../../../services/axios";
import Snackbar from "../../../components/snackBar/SnackBar";

/*
 * INTEGRAÇÃO COM A API
 * --------------------
 * O backend atual (api/src) possui apenas:
 *   POST /commands/:command_id/orders  -> OrderController.createOrder
 *
 * Ainda NÃO existem endpoints de leitura (GET /orders, GET /orders/:id).
 * Por isso esta tela:
 *  1. tenta usar api.getAllOrders() / api.getOrderById(id), se existirem
 *     (basta adicioná-los em src/services/axios.js quando o backend criar os GETs);
 *  2. enquanto eles não existem, usa MOCK_ORDERS (mesmos dados da imagem)
 *     para a tela ficar navegável e validada.
 *
 * Formato esperado da API quando existir:
 *   GET /orders -> { error:false, message, data: [ { order_id, command_id,
 *     table_number, items_resumo ou items:[{quantity, product_name, unit_price}],
 *     total, status: PENDING|PREPARING|READY|DELIVERED|CANCELLED,
 *     observations, origin, created_at, started_at, finished_at } ] }
 */

const FILTROS = [
  { id: "TODOS", label: "Todos" },
  { id: "PENDING", label: "Recebidos" },
  { id: "PREPARING", label: "Na Cozinha" },
  { id: "READY", label: "Prontos" },
  { id: "DELIVERED", label: "Entregues" },
];

const STATUS_LABEL = {
  PENDING: "RECEBIDO",
  PREPARING: "NA COZINHA",
  READY: "PRONTO",
  DELIVERED: "ENTREGUE",
  CANCELLED: "CANCELADO",
};

const STATUS_BADGE = {
  PENDING: "bg-yellow-50 text-yellow-600",
  PREPARING: "bg-cyan-50 text-cyan-600",
  READY: "bg-red-50 text-red-500",
  DELIVERED: "bg-green-50 text-green-600",
  CANCELLED: "bg-slate-100 text-slate-500",
};

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function resumoItens(order) {
  if (!order?.items?.length) return "—";
  return order.items
    .map((i) => `${i.quantity}x ${i.product_name}`)
    .join(", ");
}

function hojeLabel() {
  try {
    const texto = new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
    });
    return `Hoje, ${texto}`;
  } catch {
    return "Hoje";
  }
}

function normalizarPedidos(payload) {
  const lista = Array.isArray(payload) ? payload : payload?.data ?? [];
  if (!Array.isArray(lista)) return [];
  return lista.map((o) => ({
    order_id: o.order_id ?? o.id,
    table_number: o.table_number ?? o.table_id ?? null,
    table_label:
      o.table_label ??
      (o.table_number || o.table_id ? `Mesa T-${String(o.table_number ?? o.table_id).padStart(2, "0")}` : "Mesa —"),
    origin: o.origin ?? "WAITER",
    origin_label: o.origin_label ?? null,
    status: o.status ?? "PENDING",
    observations: o.observations ?? o.observation ?? null,
    created_at: o.created_at ?? o.horario ?? "--:--",
    started_at: o.started_at ?? null,
    finished_at: o.finished_at ?? null,
    total:
      o.total ??
      (Array.isArray(o.items)
        ? o.items.reduce((s, i) => s + Number(i.quantity ?? 1) * Number(i.unit_price ?? 0), 0)
        : 0),
    items: Array.isArray(o.items)
      ? o.items.map((i) => ({
          quantity: i.quantity ?? 1,
          product_name: i.product_name ?? i.name ?? "Item",
          unit_price: Number(i.unit_price ?? i.price ?? 0),
          observation: i.observation ?? null,
        }))
      : [],
  }));
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [usandoMock, setUsandoMock] = useState(false);
  const [filtro, setFiltro] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [buscaInvalida, setBuscaInvalida] = useState(false);
  const [selecionadoId, setSelecionadoId] = useState(4093);
  const [snackbar, setSnackbar] = useState(null);

  useEffect(() => {
    let montado = true;

    async function carregar() {
      try {
        setCarregando(true);

        // Quando o backend expuser o GET, basta adicionar
        // getAllOrders em services/axios.js que esta tela passa a usar a API.
        if (typeof api.getAllOrders === "function") {
          const response = await api.getAllOrders();
          const lista = normalizarPedidos(response?.data?.data ?? response?.data);
          if (montado) {
            setPedidos(lista);
            setUsandoMock(false);
            if (lista.length > 0) setSelecionadoId((id) => id ?? lista[0].order_id);
          }
        } else {
          // Fallback demonstrável (mesmos dados da imagem).
          await new Promise((r) => setTimeout(r, 350));
          if (montado) {
            setPedidos(MOCK_ORDERS);
            setUsandoMock(true);
          }
        }
      } catch (error) {
        if (montado) {
          setPedidos(MOCK_ORDERS);
          setUsandoMock(true);
          setSnackbar({
            message:
              error?.response?.data?.message ||
              "API de pedidos indisponível. Exibindo dados de exemplo.",
            type: "info",
          });
        }
      } finally {
        if (montado) setCarregando(false);
      }
    }

    carregar();
    return () => {
      montado = false;
    };
  }, []);

  // Busca aceita SOMENTE o ID do pedido (somente números, "#" opcional).
  function aoDigitarBusca(valor) {
    if (valor === "") {
      setBusca("");
      setBuscaInvalida(false);
      return;
    }
    const somenteDigitos = valor.replace(/[^0-9]/g, "");
    setBusca(somenteDigitos);
    // Se o usuário digitou letra ou símbolo, avisa que só ID é aceito.
    setBuscaInvalida(somenteDigitos !== valor.replace(/^#/, "").replace(/[^0-9]/g, "") || /[a-zA-Z]/.test(valor));
  }

  const filtrados = useMemo(() => {
    let lista = pedidos;
    if (filtro !== "TODOS") lista = lista.filter((p) => p.status === filtro);
    const termo = busca.trim();
    if (termo) lista = lista.filter((p) => String(p.order_id).includes(termo));
    return lista;
  }, [pedidos, filtro, busca]);

  const selecionado = useMemo(
    () => pedidos.find((p) => p.order_id === selecionadoId) ?? null,
    [pedidos, selecionadoId],
  );

  const stats = useMemo(() => {
    const emPreparo = pedidos.filter((p) => p.status === "PREPARING").length;
    const faturamento = pedidos.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const ticketMedio = pedidos.length > 0 ? faturamento / pedidos.length : 0;
    return {
      hoje: pedidos.length,
      emPreparo,
      ticketMedio,
      faturamento,
    };
  }, [pedidos]);

  function etapaStatus(pedido) {
    // 1 Recebido (PENDING criado) -> 2 Na Cozinha (PREPARING) -> 3 Pronto (READY/DELIVERED)
    if (!pedido) return 0;
    if (pedido.status === "PENDING") return 1;
    if (pedido.status === "PREPARING") return 2;
    if (pedido.status === "READY" || pedido.status === "DELIVERED") return 3;
    return 0;
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

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* ---------- COLUNA CENTRAL ---------- */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-start gap-3">
            <div className="mr-auto">
              <h2 className="text-xl font-bold text-slate-900">Gerenciamento de Pedidos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Acompanhe o fluxo de preparo da cozinha em tempo real.
              </p>
            </div>
            <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 shadow-sm">
              <CalendarDays size={16} className="text-slate-500" />
              {hojeLabel()}
            </span>
          </div>

          {usandoMock && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
              Backend sem GET de pedidos no momento — exibindo dados de exemplo. Assim que{" "}
              <code>GET /orders</code> existir, a tela lista os pedidos reais automaticamente.
            </p>
          )}

          {/* Cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-slate-500">Pedidos Hoje</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#ff5a47]">
                  <ReceiptText size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.hoje}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-slate-500">Em Preparo</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#ff5a47]">
                  <Clock3 size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.emPreparo}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-slate-500">Ticket Médio</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#ff5a47]">
                  <CircleDollarSign size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatarMoeda(stats.ticketMedio)}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-slate-500">Faturamento</p>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-[#ff5a47]">
                  <ChartColumn size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{formatarMoeda(stats.faturamento)}</p>
            </div>
          </div>

          {/* Filtros + busca por ID */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltro(f.id)}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                  filtro === f.id
                    ? "bg-[#ff5a47] text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}

            <div className="relative ml-auto w-full sm:w-64">
              <Search
                size={15}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
              />
              <input
                value={busca}
                onChange={(e) => aoDigitarBusca(e.target.value)}
                placeholder="Buscar por ID do pedido... (só números)"
                inputMode="numeric"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#ff5a47]"
              />
            </div>
          </div>
          {buscaInvalida && (
            <p className="mt-1 text-right text-[11px] font-medium text-amber-600">
              A busca aceita apenas o ID do pedido (números).
            </p>
          )}

          {/* Lista */}
          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            {carregando ? (
              <p className="p-8 text-center text-[13px] text-slate-500">Carregando pedidos...</p>
            ) : filtrados.length === 0 ? (
              <p className="p-8 text-center text-[13px] text-slate-500">
                Nenhum pedido encontrado para este filtro / ID.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-white">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[12px] text-slate-500">
                      <th className="rounded-l-lg px-4 py-2.5 font-semibold">No Pedido</th>
                      <th className="px-4 py-2.5 font-semibold">Mesa</th>
                      <th className="px-4 py-2.5 font-semibold">Itens do Pedido</th>
                      <th className="px-4 py-2.5 font-semibold">Valor Total</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="rounded-r-lg px-4 py-2.5 font-semibold">Horário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => {
                      const ativo = p.order_id === selecionadoId;
                      return (
                        <tr
                          key={p.order_id}
                          onClick={() => setSelecionadoId(p.order_id)}
                          className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${
                            ativo ? "bg-red-50/40" : ""
                          }`}
                        >
                          <td className="px-4 py-3.5 text-[13px] font-bold text-slate-900">
                            #{p.order_id}
                          </td>
                          <td className="px-4 py-3.5 text-[13px] font-medium text-slate-600">
                            {p.table_label}
                          </td>
                          <td className="max-w-[220px] truncate px-4 py-3.5 text-[13px] text-slate-500">
                            {resumoItens(p)}
                          </td>
                          <td className="px-4 py-3.5 text-[13px] font-bold text-slate-900">
                            {formatarMoeda(p.total)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide ${STATUS_BADGE[p.status] ?? "bg-slate-100 text-slate-600"}`}
                            >
                              {STATUS_LABEL[p.status] ?? p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[13px] text-slate-400">
                            {typeof p.created_at === "string" && p.created_at.length <= 5
                              ? p.created_at
                              : String(p.created_at ?? "").slice(11, 16) || "--:--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ---------- ABA LATERAL DIREITA ---------- */}
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-4">
          {!selecionado ? (
            <p className="p-8 text-center text-[13px] text-slate-500">
              Clique em um pedido da lista para ver os detalhes e peculiaridades.
            </p>
          ) : (
            <>
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-start gap-2">
                  <h3 className="mr-auto text-[16px] font-bold text-slate-900">
                    Detalhes do Pedido #{selecionado.order_id}
                  </h3>
                  <span className="rounded-md bg-red-50 px-2 py-1 text-[11px] font-bold text-[#ff5a47]">
                    {selecionado.table_label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelecionadoId(null)}
                    className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 xl:hidden"
                    aria-label="Fechar detalhes"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="mt-1 text-[12px] text-slate-500">
                  {selecionado.origin_label ??
                    (selecionado.origin === "CUSTOMER"
                      ? "Recebido via aplicativo de mesa"
                      : "Recebido pelo garçom")}
                </p>
              </div>

              <div className="border-b border-slate-100 p-5">
                <p className="text-[11px] font-bold tracking-wide text-slate-400">
                  STATUS DO PREPARO
                </p>
                <div className="mt-3 flex items-start justify-between gap-2">
                  {[
                    { n: 1, titulo: "Recebido", hora: selecionado.created_at },
                    { n: 2, titulo: "Na Cozinha", hora: selecionado.started_at },
                    { n: 3, titulo: "Pronto", hora: selecionado.finished_at },
                  ].map((etapa) => {
                    const atual = etapaStatus(selecionado);
                    const concluida = atual >= etapa.n;
                    const hora =
                      typeof etapa.hora === "string" && etapa.hora.length <= 5
                        ? etapa.hora
                        : etapa.hora
                          ? String(etapa.hora).slice(11, 16)
                          : null;
                    return (
                      <div key={etapa.n} className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            concluida ? "bg-[#ff5a47] text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {etapa.n}
                        </span>
                        <span>
                          <span className="block text-[12px] font-semibold text-slate-800">
                            {etapa.titulo}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {hora ?? "Pendente"}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-5 p-5">
                {selecionado.observations ? (
                  <div className="rounded-xl border border-amber-400 bg-amber-50 p-3">
                    <p className="text-[11px] font-bold tracking-wide text-amber-500">
                      INSTRUÇÕES ESPECIAIS
                    </p>
                    <p className="mt-1 text-[13px] text-slate-800">
                      &quot;{selecionado.observations}&quot;
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-bold tracking-wide text-slate-400">
                      INSTRUÇÕES ESPECIAIS
                    </p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      Nenhuma peculiaridade informada para este pedido.
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-bold tracking-wide text-slate-400">
                    ITENS DO PEDIDO
                  </p>
                  <div className="mt-2 rounded-xl bg-slate-50 p-4">
                    <ul className="flex flex-col gap-2.5">
                      {selecionado.items.map((item, idx) => (
                        <li key={idx} className="flex items-baseline gap-2 text-[13px]">
                          <span className="font-bold text-[#ff5a47]">{item.quantity}x</span>
                          <span className="flex-1 text-slate-800">
                            {item.product_name}
                            {item.observation && (
                              <span className="block text-[11px] text-slate-400">
                                Obs.: {item.observation}
                              </span>
                            )}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatarMoeda(Number(item.quantity) * Number(item.unit_price))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-[14px] font-bold text-slate-900">Total do Pedido</span>
                      <span className="text-[16px] font-bold text-[#ff5a47]">
                        {formatarMoeda(selecionado.total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
                  <p>
                    <span className="font-semibold text-slate-700">Comanda:</span> #
                    {selecionado.command_id ?? "—"} ·{" "}
                    <span className="font-semibold text-slate-700">Origem:</span>{" "}
                    {selecionado.origin === "CUSTOMER" ? "Cliente" : "Garçom"} ·{" "}
                    <span className="font-semibold text-slate-700">Status:</span>{" "}
                    {STATUS_LABEL[selecionado.status] ?? selecionado.status}
                  </p>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
