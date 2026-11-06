import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, ArrowDownWideNarrow, CalendarDays, ChartColumn,
  Check, ChevronLeft, ChevronRight, CircleDollarSign, Clock3,
  ReceiptText, RefreshCw, Search, SlidersHorizontal, X,
} from "lucide-react";

import api from "../../../services/axios";

const PERIODOS = [
  { id: "TODOS", label: "Todos" },
  { id: "HOJE", label: "Hoje" },
  { id: "ONTEM", label: "Ontem" },
  { id: "SEMANA", label: "Últimos 7 dias" },
  { id: "DIA", label: "Data específica" },
  { id: "INTERVALO", label: "Intervalo" },
];

const STATUS = {
  PENDING: { label: "Recebido", classe: "bg-amber-50 text-amber-800 ring-amber-200" },
  PREPARING: { label: "Na cozinha", classe: "bg-sky-50 text-sky-700 ring-sky-200" },
  READY: { label: "Pronto", classe: "bg-orange-50 text-orange-700 ring-orange-200" },
  DELIVERED: { label: "Entregue", classe: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CANCELLED: { label: "Cancelado", classe: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const DATA_LOCAL = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit",
  day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
const CAMPO = "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#ff5a47] focus:ring-2 focus:ring-[#ff5a47]/20";
const BOTAO = "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5a47] disabled:cursor-not-allowed disabled:opacity-40";

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ISO com fuso é convertido para Brasília. DATETIME sem fuso mantém a data local recebida.
function lerData(valor) {
  if (!valor) return { dia: "", hora: "—", ordem: 0 };
  let data;
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(valor)) {
    data = new Date(`${valor.replace(" ", "T")}-03:00`);
  } else {
    data = new Date(valor);
  }
  if (Number.isNaN(data.getTime())) return { dia: "", hora: "—", ordem: 0 };
  const partes = Object.fromEntries(DATA_LOCAL.formatToParts(data).map((parte) => [parte.type, parte.value]));
  return {
    dia: `${partes.year}-${partes.month}-${partes.day}`,
    hora: `${partes.hour}:${partes.minute}`,
    ordem: data.getTime(),
  };
}

function exibirDia(dia) {
  return dia ? dia.split("-").reverse().join("/") : "Data não informada";
}

function deslocarDia(dia, quantidade) {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + quantidade);
  return data.toISOString().slice(0, 10);
}

function normalizarTexto(valor) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function normalizarPedidos(payload) {
  const lista = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(lista)) throw new Error("Não foi possível ler os pedidos recebidos.");
  return lista.map((pedido) => {
    const items = (pedido.items ?? []).map((item) => ({
      quantity: Number(item.quantity ?? 1),
      product_name: item.product_name ?? item.name ?? "Item",
      unit_price: Number(item.unit_price ?? item.price ?? 0),
      observation: item.observation ?? null,
    }));
    return {
      ...pedido,
      order_id: pedido.order_id ?? pedido.id,
      table_label: pedido.table_number != null ? `Mesa ${String(pedido.table_number).padStart(2, "0")}` : "Mesa não informada",
      customer_name: pedido.customer_name ?? "",
      status: pedido.status ?? "PENDING",
      data: lerData(pedido.created_at),
      total: Number(pedido.total ?? items.reduce((soma, item) => soma + item.quantity * item.unit_price, 0)),
      items,
    };
  });
}

function StatusPedido({ status }) {
  const info = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${info?.classe ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {info?.label ?? status}
    </span>
  );
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [ultimaConsulta, setUltimaConsulta] = useState(null);
  const [recarregar, setRecarregar] = useState(0);
  const [hoje, setHoje] = useState(() => lerData(new Date()).dia);
  const [periodo, setPeriodo] = useState("HOJE");
  const [inicio, setInicio] = useState(hoje);
  const [fim, setFim] = useState(hoje);
  const [status, setStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("RECENTES");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const painelDetalhes = useRef(null);

  useEffect(() => {
    let ativo = true;
    let emCurso = false;
    async function carregar() {
      if (emCurso) return;
      emCurso = true;
      try {
        const response = await api.getAllOrders();
        const lista = normalizarPedidos(response.data?.data ?? response.data);
        if (ativo) {
          setPedidos(lista);
          setErro("");
          setUltimaConsulta(new Date());
          setHoje(lerData(new Date()).dia);
        }
      } catch (error) {
        if (ativo) setErro(error.response?.data?.message || "Não foi possível carregar os pedidos. Verifique sua conexão e tente novamente.");
      } finally {
        emCurso = false;
        if (ativo) { setCarregando(false); setAtualizando(false); }
      }
    }
    carregar();
    const intervalo = setInterval(() => {
      if (document.visibilityState === "visible") carregar();
    }, 30000);
    function aoVoltar() { if (document.visibilityState === "visible") carregar(); }
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [recarregar]);

  function atualizar() {
    setAtualizando(true);
    setRecarregar((valor) => valor + 1);
  }

  function reiniciarLista() { setPagina(1); setSelecionadoId(null); }

  function escolherPeriodo(valor) {
    setPeriodo(valor);
    reiniciarLista();
    if (valor === "TODOS") { setStatus("TODOS"); setBusca(""); }
  }

  function limparBuscaStatus() { setStatus("TODOS"); setBusca(""); reiniciarLista(); }

  let de = "";
  let ate = "";
  if (periodo === "HOJE") de = ate = hoje;
  if (periodo === "ONTEM") de = ate = deslocarDia(hoje, -1);
  if (periodo === "SEMANA") { de = deslocarDia(hoje, -6); ate = hoje; }
  if (periodo === "DIA") de = ate = inicio;
  if (periodo === "INTERVALO") { de = inicio; ate = fim; }

  const erroPeriodo = periodo !== "TODOS" && (!de || !ate)
    ? "Preencha as datas para consultar os pedidos."
    : de && ate && de > ate ? "A data final deve ser igual ou posterior à data inicial." : "";
  const rotuloPeriodo = periodo === "TODOS" ? "Todo o histórico"
    : erroPeriodo ? "Selecione um período"
    : periodo === "HOJE" ? `Hoje, ${exibirDia(hoje)}`
    : de === ate ? exibirDia(de) : `${exibirDia(de)} a ${exibirDia(ate)}`;

  const pedidosPeriodo = useMemo(() => {
    if (erroPeriodo) return [];
    if (periodo === "TODOS") return pedidos;
    return pedidos.filter((pedido) => pedido.data.dia && pedido.data.dia >= de && pedido.data.dia <= ate);
  }, [pedidos, periodo, de, ate, erroPeriodo]);

  const filtrados = useMemo(() => {
    const termo = normalizarTexto(busca.trim()).replace(/^#/, "");
    return pedidosPeriodo.filter((pedido) => {
      if (status !== "TODOS" && pedido.status !== status) return false;
      const texto = normalizarTexto([
        pedido.order_id, pedido.command_id, pedido.table_label, pedido.customer_name,
        ...pedido.items.map((item) => item.product_name),
      ].join(" "));
      return !termo || texto.includes(termo);
    }).sort((a, b) => {
      const comparacao = b.data.ordem - a.data.ordem || Number(b.order_id) - Number(a.order_id);
      return ordem === "RECENTES" ? comparacao : -comparacao;
    });
  }, [pedidosPeriodo, status, busca, ordem]);

  const stats = useMemo(() => {
    const validos = pedidosPeriodo.filter((pedido) => pedido.status !== "CANCELLED");
    const total = validos.reduce((soma, pedido) => soma + pedido.total, 0);
    return {
      quantidade: pedidosPeriodo.length,
      preparando: pedidosPeriodo.filter((pedido) => pedido.status === "PREPARING").length,
      total, medio: validos.length ? total / validos.length : 0,
    };
  }, [pedidosPeriodo]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const primeiro = (paginaAtual - 1) * porPagina;
  const visiveis = filtrados.slice(primeiro, primeiro + porPagina);
  const selecionado = filtrados.find((pedido) => pedido.order_id === selecionadoId) ?? null;
  const semDados = carregando || !!erroPeriodo || (!!erro && !ultimaConsulta);
  const filtrosExtras = status !== "TODOS" || busca.trim();

  function selecionarPedido(id) {
    setSelecionadoId(id);
    if (window.matchMedia("(max-width: 1279px)").matches) {
      requestAnimationFrame(() => {
        painelDetalhes.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        painelDetalhes.current?.focus({ preventScroll: true });
      });
    }
  }

  const cards = [
    { titulo: "Pedidos no período", valor: stats.quantidade, detalhe: "Todos os status", icon: ReceiptText },
    { titulo: "Na cozinha", valor: stats.preparando, detalhe: "Em preparo neste momento", icon: Clock3 },
    { titulo: "Ticket médio", valor: formatarMoeda(stats.medio), detalhe: "Pedidos não cancelados", icon: CircleDollarSign },
    { titulo: "Valor em pedidos", valor: formatarMoeda(stats.total), detalhe: "Pedidos não cancelados", icon: ChartColumn },
  ];

  return (
    <div className="min-h-full space-y-5 text-slate-800">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gerenciamento de pedidos</h2>
          <p className="mt-1 text-sm text-slate-500">Acompanhe o atendimento de hoje ou consulte pedidos de outras datas.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-right text-xs leading-5 text-slate-500 sm:block">
            {ultimaConsulta ? `Atualizado às ${lerData(ultimaConsulta).hora}` : "Consultando pedidos"}
            <span className="block">Atualização a cada 30 s</span>
          </span>
          <button type="button" onClick={atualizar} disabled={carregando || atualizando} className={BOTAO}>
            <RefreshCw size={16} className={atualizando ? "animate-spin" : ""} />
            {atualizando ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </header>

      <section aria-label="Filtro de data" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={18} className="text-[#ff5a47]" /> Período dos pedidos</h3>
          <p className="text-xs text-slate-500">Data de criação · Horário de Brasília</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Escolher período">
          {PERIODOS.map((opcao) => (
            <button key={opcao.id} type="button" aria-pressed={periodo === opcao.id} onClick={() => escolherPeriodo(opcao.id)}
              className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff5a47] ${periodo === opcao.id ? "bg-[#ff5a47] text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
              {opcao.label}
            </button>
          ))}
        </div>
        {(periodo === "DIA" || periodo === "INTERVALO") && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
              {periodo === "DIA" ? "Data do pedido" : "De"}
              <input type="date" value={inicio} aria-invalid={!!erroPeriodo} aria-describedby={erroPeriodo ? "erro-periodo" : undefined}
                onChange={(event) => { setInicio(event.target.value); reiniciarLista(); }} className={CAMPO} />
            </label>
            {periodo === "INTERVALO" && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
                Até
                <input type="date" value={fim} min={inicio || undefined} aria-invalid={!!erroPeriodo} aria-describedby={erroPeriodo ? "erro-periodo" : undefined}
                  onChange={(event) => { setFim(event.target.value); reiniciarLista(); }} className={CAMPO} />
              </label>
            )}
            <p className="pb-2 text-xs text-slate-500">{periodo === "INTERVALO" ? "Inclui todos os pedidos das duas datas." : "A consulta considera o dia inteiro."}</p>
          </div>
        )}
        {erroPeriodo && <p id="erro-periodo" role="alert" className="mt-3 text-sm text-red-600">{erroPeriodo}</p>}
      </section>

      {erro && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle size={20} className="shrink-0" />
          <div className="flex-1"><p>{erro}</p>{ultimaConsulta && <p className="mt-1 text-xs">Exibindo a última consulta bem-sucedida. Os pedidos podem ter mudado.</p>}</div>
          <button type="button" onClick={atualizar} disabled={atualizando} className="cursor-pointer whitespace-nowrap font-semibold underline">Tentar novamente</button>
        </div>
      )}

      <section aria-label="Resumo do período">
        <p className="mb-2 text-xs font-medium text-slate-500">Resumo do período · {rotuloPeriodo}</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ titulo, valor, detalhe, icon: Icon }) => (
            <div key={titulo} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500">{titulo}</p>
                <span className="rounded-lg bg-red-50 p-2 text-[#ff5a47]"><Icon size={17} /></span>
              </div>
              <p className="mt-2 break-words text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{semDados ? "—" : valor}</p>
              <p className="mt-1 text-[11px] text-slate-500">{detalhe}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-label="Lista de pedidos" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">{rotuloPeriodo}</h3>
              <p className="text-xs text-slate-500" aria-live="polite">{semDados ? "—" : `${filtrados.length} ${filtrados.length === 1 ? "pedido encontrado" : "pedidos encontrados"}`}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="relative min-w-[180px] flex-1">
                <label htmlFor="busca-pedidos" className="sr-only">Buscar pedido, mesa, cliente ou produto</label>
                <Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                <input id="busca-pedidos" type="search" value={busca} onChange={(event) => { setBusca(event.target.value); reiniciarLista(); }}
                  placeholder="Pedido, mesa, cliente ou produto" className={`${CAMPO} w-full pl-10 pr-9 [&::-webkit-search-cancel-button]:appearance-none`} />
                {busca && <button type="button" onClick={() => { setBusca(""); reiniciarLista(); }} aria-label="Limpar busca" className="absolute right-2 top-2 cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={16} /></button>}
              </div>
              <label className="relative flex items-center gap-2">
                <SlidersHorizontal size={16} className="pointer-events-none absolute left-3 text-slate-400" />
                <span className="sr-only">Status do pedido</span>
                <select value={status} onChange={(event) => { setStatus(event.target.value); reiniciarLista(); }} className={`${CAMPO} w-full pl-9 sm:w-44`}>
                  <option value="TODOS">Qualquer status</option>
                  {Object.entries(STATUS).map(([valor, info]) => <option key={valor} value={valor}>{info.label}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">A busca e o status refinam a lista. Os cartões resumem o período.</p>
              {filtrosExtras && <button type="button" onClick={limparBuscaStatus} className="cursor-pointer text-xs font-semibold text-[#d93d2a] hover:underline">Limpar busca e status</button>}
            </div>
          </div>

          {carregando ? (
            <div role="status" className="flex items-center justify-center gap-3 p-16 text-sm text-slate-500"><RefreshCw size={20} className="animate-spin" /> Carregando pedidos…</div>
          ) : erro && !ultimaConsulta ? (
            <div className="p-12 text-center"><AlertCircle size={32} className="mx-auto text-amber-500" /><h4 className="mt-3 font-semibold">Pedidos indisponíveis</h4><p className="mt-2 text-sm text-slate-500">Tente atualizar para consultar os pedidos reais.</p></div>
          ) : erroPeriodo ? (
            <div className="p-12 text-center text-sm text-slate-500"><CalendarDays size={32} className="mx-auto mb-3 text-slate-400" />Ajuste as datas acima para consultar o período.</div>
          ) : filtrados.length === 0 ? (
            <div className="px-6 py-14 text-center" role="status">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5a47]"><CalendarDays size={26} /></div>
              <h4 className="mt-4 text-lg font-bold text-slate-900">
                {pedidosPeriodo.length ? "Nenhum pedido corresponde aos filtros" : periodo === "TODOS" ? "Nenhum pedido registrado" : de === ate ? `Nenhum pedido em ${exibirDia(de)}` : "Nenhum pedido neste período"}
              </h4>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {pedidosPeriodo.length ? "Tente outro nome, número de pedido ou status." : periodo === "TODOS" ? "Os pedidos aparecerão aqui quando forem realizados." : "Não há pedidos criados nessas datas. Consulte outro período ou veja o histórico completo."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {filtrosExtras && <button type="button" onClick={limparBuscaStatus} className={BOTAO}>Limpar busca e status</button>}
                {periodo !== "TODOS" && <button type="button" onClick={() => escolherPeriodo("TODOS")} className="cursor-pointer rounded-xl bg-[#ff5a47] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e94b39]">Ver todos os pedidos</button>}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                <p className="text-xs text-slate-500">Selecione um pedido para ver os detalhes</p>
                <label className="flex items-center gap-1 text-xs text-slate-600"><ArrowDownWideNarrow size={15} /><span className="sr-only">Ordenar pedidos</span>
                  <select value={ordem} onChange={(event) => { setOrdem(event.target.value); reiniciarLista(); }} className="cursor-pointer rounded-lg bg-white py-1.5 outline-none focus:ring-2 focus:ring-[#ff5a47]/30">
                    <option value="RECENTES">Mais recentes</option><option value="ANTIGOS">Mais antigos</option>
                  </select>
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[660px] text-left text-sm">
                  <caption className="sr-only">Pedidos em {rotuloPeriodo}. Datas e horários de Brasília.</caption>
                  <thead className="bg-slate-50 text-xs text-slate-500"><tr>
                    {["Pedido / mesa", "Itens", "Valor", "Status", "Data e hora"].map((titulo) => <th key={titulo} scope="col" className="px-4 py-3 font-semibold">{titulo}</th>)}
                  </tr></thead>
                  <tbody>
                    {visiveis.map((pedido) => (
                      <tr key={pedido.order_id} onClick={() => selecionarPedido(pedido.order_id)}
                        className={`cursor-pointer border-t border-slate-100 transition hover:bg-orange-50/40 ${selecionado?.order_id === pedido.order_id ? "bg-orange-50/70" : ""}`}>
                        <td className="px-4 py-3.5">
                          <button type="button" onClick={(event) => { event.stopPropagation(); selecionarPedido(pedido.order_id); }} aria-label={`Ver detalhes do pedido ${pedido.order_id}`} aria-pressed={selecionado?.order_id === pedido.order_id}
                            className="cursor-pointer rounded text-sm font-bold text-slate-900 hover:text-[#e94b39] focus-visible:outline-2 focus-visible:outline-[#ff5a47]">#{pedido.order_id}</button>
                          <p className="mt-1 whitespace-nowrap text-xs text-slate-500">{pedido.table_label}</p>
                        </td>
                        <td className="max-w-[240px] px-4 py-3.5">
                          <p className="truncate text-xs text-slate-700" title={pedido.items.map((item) => `${item.quantity}x ${item.product_name}`).join(", ")}>
                            {pedido.items.map((item) => `${item.quantity}x ${item.product_name}`).join(", ") || "Sem itens"}
                          </p>
                          {pedido.customer_name && <p className="mt-1 truncate text-xs text-slate-500">{pedido.customer_name}</p>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold tabular-nums">{formatarMoeda(pedido.total)}</td>
                        <td className="px-4 py-3.5"><StatusPedido status={pedido.status} /></td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-xs tabular-nums"><p>{exibirDia(pedido.data.dia)}</p><p className="mt-1 text-slate-500">{pedido.data.hora}</p></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                <span>{primeiro + 1}–{Math.min(primeiro + porPagina, filtrados.length)} de {filtrados.length} pedidos</span>
                <label className="flex items-center gap-2">Por página <select value={porPagina} onChange={(event) => { setPorPagina(Number(event.target.value)); reiniciarLista(); }} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700">{[10, 25, 50].map((valor) => <option key={valor}>{valor}</option>)}</select></label>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Página anterior" disabled={paginaAtual === 1} onClick={() => { setPagina(paginaAtual - 1); setSelecionadoId(null); }} className={BOTAO}><ChevronLeft size={15} /></button>
                  <span className="tabular-nums">{paginaAtual} / {totalPaginas}</span>
                  <button type="button" aria-label="Próxima página" disabled={paginaAtual === totalPaginas} onClick={() => { setPagina(paginaAtual + 1); setSelecionadoId(null); }} className={BOTAO}><ChevronRight size={15} /></button>
                </div>
              </footer>
            </>
          )}
        </section>

        <aside ref={painelDetalhes} tabIndex={-1} aria-label="Detalhes do pedido" className={`${selecionado ? "block" : "hidden xl:block"} scroll-mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm outline-none xl:sticky xl:top-5`}>
          {!selecionado ? (
            <div className="px-6 py-12 text-center">
              <ReceiptText size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-4 font-bold text-slate-800">Detalhes do pedido</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Selecione um pedido na lista para consultar os itens, a comanda e o andamento.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-[#e94b39]">{selecionado.table_label}</p><h3 className="mt-1 text-lg font-bold">Pedido #{selecionado.order_id}</h3></div>
                  <button type="button" onClick={() => setSelecionadoId(null)} aria-label="Fechar detalhes" className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                </div>
                <p className="mt-2 text-xs text-slate-500">Criado em {exibirDia(selecionado.data.dia)} às {selecionado.data.hora}</p>
                <div className="mt-3"><StatusPedido status={selecionado.status} /></div>
              </div>
              <div className="space-y-5 p-5">
                <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                  <div><dt className="text-slate-500">Comanda</dt><dd className="mt-1 font-semibold">{selecionado.command_id ? `#${selecionado.command_id}` : "Não informada"}</dd></div>
                  <div><dt className="text-slate-500">Origem</dt><dd className="mt-1 font-semibold">{selecionado.origin === "CUSTOMER" ? "Cliente" : selecionado.origin === "WAITER" ? "Garçom" : "Não informada"}</dd></div>
                  {selecionado.customer_name && <div className="col-span-2"><dt className="text-slate-500">Cliente / grupo</dt><dd className="mt-1 break-words font-semibold">{selecionado.customer_name}</dd></div>}
                </dl>
                {selecionado.status === "CANCELLED" ? (
                  <div className="rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">Pedido cancelado. O valor não entra no total nem no ticket médio do período.
                    {selecionado.cancelled_at && <p>Cancelado em {exibirDia(lerData(selecionado.cancelled_at).dia)} às {lerData(selecionado.cancelled_at).hora}.</p>}
                  </div>
                ) : (
                  <div>
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Andamento</h4>
                    <ol className="space-y-3">
                      {[
                        { status: "PENDING", titulo: "Recebido", data: selecionado.created_at },
                        { status: "PREPARING", titulo: "Na cozinha", data: selecionado.started_at },
                        { status: "READY", titulo: "Pronto", data: selecionado.finished_at },
                        { status: "DELIVERED", titulo: "Entregue", data: null },
                      ].map((etapa, index) => {
                        const atingida = ["PENDING", "PREPARING", "READY", "DELIVERED"].indexOf(selecionado.status) >= index;
                        return <li key={etapa.status} className="flex items-center gap-3 text-xs">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${atingida ? "bg-[#ff5a47] text-white" : "bg-slate-100 text-slate-400"}`}>{atingida ? <Check size={13} /> : index + 1}</span>
                          <span className={atingida ? "font-semibold text-slate-700" : "text-slate-400"}>{etapa.titulo}</span>
                          <span className="ml-auto text-slate-500">{etapa.data ? lerData(etapa.data).hora : atingida ? "Concluído" : "Aguardando"}</span>
                        </li>;
                      })}
                    </ol>
                  </div>
                )}
                {selecionado.observations && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><h4 className="text-xs font-bold text-amber-800">Observações do pedido</h4><p className="mt-1 break-words text-sm text-amber-900">{selecionado.observations}</p></div>}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Itens do pedido</h4>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {selecionado.items.map((item, index) => <li key={index} className="flex items-start gap-2 py-3 text-xs">
                      <span className="rounded-md bg-orange-50 px-1.5 py-1 font-bold text-[#e94b39]">{item.quantity}×</span>
                      <div className="min-w-0 flex-1"><p className="break-words font-medium leading-5">{item.product_name}</p><p className="mt-1 text-slate-500">{formatarMoeda(item.unit_price)} / un.</p>{item.observation && <p className="mt-2 break-words rounded-lg bg-amber-50 p-2 text-amber-800">{item.observation}</p>}</div>
                      <span className="whitespace-nowrap pt-1 font-semibold tabular-nums">{formatarMoeda(item.quantity * item.unit_price)}</span>
                    </li>)}
                  </ul>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-4"><span className="text-sm font-bold">Total do pedido</span><span className="text-lg font-bold text-[#e94b39]">{formatarMoeda(selecionado.total)}</span></div>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
