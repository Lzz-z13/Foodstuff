import { RefreshCw, Bell, BellOff, TrendingUp, Flame, CheckCircle2, Wallet } from "lucide-react";

export default function KitchenHeader({
  orders = [],
  onRefresh,
  autoRefresh = true,
  onAutoRefreshToggle,
  refreshing = false,
}) {
  const stats = {
    novos: orders.filter((o) => o.status === "PENDING").length,
    preparando: orders.filter((o) => o.status === "PREPARING").length,
    prontos: orders.filter((o) => o.status === "READY").length,
    faturamento: orders.reduce((s, o) => s + Number(o.total ?? 0), 0),
  };

  const formatarMoeda = (valor) =>
    Number(valor ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div className="border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          <StatChip
            icon={<TrendingUp size={14} />}
            iconClass="bg-amber-100 text-amber-700"
            label="Novos"
            value={stats.novos}
            valueClass="text-amber-700"
          />
          <StatChip
            icon={<Flame size={14} />}
            iconClass="bg-sky-100 text-sky-700"
            label="Preparando"
            value={stats.preparando}
            valueClass="text-sky-700"
          />
          <StatChip
            icon={<CheckCircle2 size={14} />}
            iconClass="bg-emerald-100 text-emerald-700"
            label="Prontos"
            value={stats.prontos}
            valueClass="text-emerald-700"
          />
          <StatChip
            icon={<Wallet size={14} />}
            iconClass="bg-[#FFF0EC] text-[#FF5F38]"
            label="Faturamento"
            value={formatarMoeda(stats.faturamento)}
            valueClass="text-[#FF5F38]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAutoRefreshToggle}
            title={
              autoRefresh
                ? "Desativar atualização automática"
                : "Ativar atualização automática"
            }
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition ${
              autoRefresh
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {autoRefresh ? (
              <Bell size={13} className="animate-pulse" />
            ) : (
              <BellOff size={13} />
            )}
            <span className="hidden sm:inline">
              {autoRefresh ? "Auto" : "Manual"}
            </span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Atualizar agora"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatChip({ icon, iconClass, label, value, valueClass }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconClass}`}
      >
        {icon}
      </span>
      <div className="leading-none">
        <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className={`mt-0.5 text-[13px] font-extrabold tabular-nums ${valueClass}`}>
          {value}
        </p>
      </div>
    </div>
  );
}
