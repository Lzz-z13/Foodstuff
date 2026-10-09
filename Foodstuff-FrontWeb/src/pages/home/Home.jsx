import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { Clock, ScrollText, Table2, Users } from "lucide-react";

const dashboardMock = {
  resumo: {
    faturamentoDia: 4280.5,
    pedidosHoje: 112,
    ticketMedio: 38.22,
    avaliacaoMedia: 4.8,
  },
  faturamentoSemanal: [
    { dia: "Seg", valor: 3120 },
    { dia: "Ter", valor: 4060 },
    { dia: "Qua", valor: 3580 },
    { dia: "Qui", valor: 5480 },
    { dia: "Sex", valor: 4350 },
    { dia: "Sáb", valor: 5860 },
    { dia: "Dom", valor: 6900 },
  ],
  pedidosPorCategoria: [
    { nome: "Burgers", quantidade: 56, cor: "#FF5A3D" },
    { nome: "Massas", quantidade: 31, cor: "#3B82F6" },
    { nome: "Bebidas", quantidade: 25, cor: "#F59E0B" },
  ],
  maisVendidos: [
    { nome: "Burger Duplo", quantidade: 94 },
    { nome: "Batata Rústica", quantidade: 72 },
    { nome: "Nhoque al Tartufo", quantidade: 51 },
    { nome: "Soda Frutas Vermelhas", quantidade: 38 },
    { nome: "Pizza Margherita", quantidade: 24 },
  ],
  pedidosRecentes: [
    {
      pedido: "#041",
      mesa: "Mesa 12",
      itens: "1x Burger Duplo, 1x Batata Rústica, 1x Soda Italiana",
      valor: 81.8,
      status: "Em Preparo",
      hora: "12:31",
    },
    {
      pedido: "#040",
      mesa: "Mesa 08",
      itens: "2x Nhoque al Tartufo, 1x Água Mineral",
      valor: 122,
      status: "Novo",
      hora: "12:28",
    },
    {
      pedido: "#039",
      mesa: "Mesa 14",
      itens: "1x Batata Rústica, 1x Soda Italiana",
      valor: 38.9,
      status: "Pronto",
      hora: "12:15",
    },
    {
      pedido: "#038",
      mesa: "Mesa 03",
      itens: "1x Pizza Margherita, 2x Coca-Cola",
      valor: 56,
      status: "Em Preparo",
      hora: "12:02",
    },
  ],
};

const statusStyles = {
  "Em Preparo": "bg-amber-100 text-amber-700",
  Novo: "bg-blue-100 text-blue-700",
  Pronto: "bg-emerald-100 text-emerald-700",
};

const formatarMoeda = (valor) =>
  Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const totalFaturamentoSemanal = dashboardMock.faturamentoSemanal.reduce(
  (total, dia) => total + dia.valor,
  0,
);

const totalPedidosCategoria = dashboardMock.pedidosPorCategoria.reduce(
  (total, categoria) => total + categoria.quantidade,
  0,
);

function CardResumo({
  titulo,
  valor,
  variacao,
  contexto,
  Icon,
  negativo = false,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{titulo}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff5a47]/10 text-[#ff5a47]">
          <Icon size={16} />
        </span>
      </div>

      <strong className="mt-5 block text-3xl font-extrabold tracking-tight text-slate-900">
        {valor}
      </strong>

      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <span
          className={
            negativo ? "font-bold text-red-500" : "font-bold text-emerald-500"
          }
        >
          {variacao}
        </span>
        {contexto}
      </p>
    </article>
  );
}

function GraficoFaturamento() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 xl:col-span-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-slate-900">
          Faturamento Semanal
        </h3>
        <span className="rounded-lg bg-[#ff5a47]/10 px-3 py-1 text-xs font-bold text-[#ff5a47]">
          Total: {formatarMoeda(totalFaturamentoSemanal)}
        </span>
      </div>

      <div className="h-[185px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dashboardMock.faturamentoSemanal}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <XAxis
              dataKey="dia"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748B" }}
            />
            <Tooltip
              cursor={{ fill: "#FFF1ED" }}
              formatter={(value) => [formatarMoeda(value), "Faturamento"]}
              contentStyle={{
                border: "1px solid #E2E8F0",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                fontSize: "12px",
              }}
            />
            <Bar
              dataKey="valor"
              fill="#FF5A3D"
              maxBarSize={22}
              radius={[9, 9, 9, 9]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function GraficoCategorias() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 xl:col-span-4">
      <h3 className="text-base font-bold text-slate-900">
        Pedidos por Categoria
      </h3>

      <div className="mt-4 grid min-h-[188px] grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_1fr]">
        <div className="relative h-[170px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dashboardMock.pedidosPorCategoria}
                dataKey="quantidade"
                nameKey="nome"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={2}
                stroke="none"
              >
                {dashboardMock.pedidosPorCategoria.map((categoria) => (
                  <Cell key={categoria.nome} fill={categoria.cor} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} pedidos`, name]}
                contentStyle={{
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <strong className="text-lg font-extrabold text-slate-900">
              {totalPedidosCategoria}
            </strong>
            <span className="text-xs font-medium text-slate-500">Pedidos</span>
          </div>
        </div>

        <div className="space-y-3">
          {dashboardMock.pedidosPorCategoria.map((categoria) => {
            const percentual = Math.round(
              (categoria.quantidade / totalPedidosCategoria) * 100,
            );

            return (
              <div
                key={categoria.nome}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: categoria.cor }}
                />
                <span>
                  {categoria.nome} ({percentual}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MaisVendidos() {
  const maiorQuantidade = dashboardMock.maisVendidos[0].quantidade;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 xl:col-span-4">
      <h3 className="text-base font-bold text-slate-900">Mais Vendidos (Top 5)</h3>

      <div className="mt-5 space-y-4">
        {dashboardMock.maisVendidos.map((produto) => (
          <div
            key={produto.nome}
            className="grid grid-cols-[minmax(0,1fr)_minmax(92px,1.25fr)_28px] items-center gap-3"
          >
            <span
              className="truncate text-xs font-medium text-slate-500"
              title={produto.nome}
            >
              {produto.nome}
            </span>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#FF5A3D]"
                style={{
                  width: `${(produto.quantidade / maiorQuantidade) * 100}%`,
                }}
              />
            </div>

            <strong className="text-right text-xs font-bold text-slate-900">
              {produto.quantidade}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function PedidosRecentes() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
      <h3 className="text-base font-bold text-slate-900">Pedidos Recentes</h3>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs font-bold text-slate-500">
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Mesa</th>
              <th className="px-4 py-3">Itens</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Hora</th>
            </tr>
          </thead>
          <tbody>
            {dashboardMock.pedidosRecentes.map((pedido) => (
              <tr
                key={pedido.pedido}
                className="border-t border-slate-100 text-slate-600"
              >
                <td className="px-4 py-4 font-extrabold text-slate-900">
                  {pedido.pedido}
                </td>
                <td className="px-4 py-4 font-semibold">{pedido.mesa}</td>
                <td
                  className="max-w-[360px] truncate px-4 py-4"
                  title={pedido.itens}
                >
                  {pedido.itens}
                </td>
                <td className="px-4 py-4 font-extrabold text-slate-900">
                  {formatarMoeda(pedido.valor)}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${statusStyles[pedido.status]}`}
                  >
                    {pedido.status}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-400">{pedido.hora}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Home() {
  const { resumo } = dashboardMock;

  return (
    <div className="min-w-0 space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardResumo
          titulo="Faturamento do Dia"
          valor={formatarMoeda(resumo.faturamentoDia)}
          variacao="+12.3%"
          contexto="vs ontem"
          Icon={ScrollText}
        />
        <CardResumo
          titulo="Pedidos Hoje"
          valor={resumo.pedidosHoje}
          variacao="+8.5%"
          contexto="vs ontem"
          Icon={Users}
        />
        <CardResumo
          titulo="Ticket Médio"
          valor={formatarMoeda(resumo.ticketMedio)}
          variacao="-2.1%"
          contexto="vs semana passada"
          Icon={Table2}
          negativo
        />
        <CardResumo
          titulo="Avaliação Média"
          valor={`${resumo.avaliacaoMedia} / 5.0`}
          variacao="+0.2"
          contexto="esta semana"
          Icon={Clock}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <GraficoFaturamento />
        <GraficoCategorias />
        <MaisVendidos />
      </section>

      <PedidosRecentes />
    </div>
  );
}
