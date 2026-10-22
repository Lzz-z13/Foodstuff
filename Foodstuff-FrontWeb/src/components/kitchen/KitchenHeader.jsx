import { RefreshCw, Bell, BellOff, Loader2 } from "lucide-react";

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

  function formatarMoeda(valor) {
    return Number(valor ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  return (
    <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Stats Cards */}
        <div className="flex flex-wrap gap-3">
          <StatCard
            label="NOVOS"
            value={stats.novos}
            bgColor="bg-[#FFF0EC]"
            textColor="text-[#FF5F38]"
            borderColor="border-[#FF5F38]/20"
            iconColor="bg-[#FF5F38]/10 text-[#FF5F38]"
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="PREPARANDO"
            value={stats.preparando}
            bgColor="bg-emerald-50"
            textColor="text-emerald-600"
            borderColor="border-emerald-100"
            iconColor="bg-emerald-100 text-emerald-600"
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="PRONTOS"
            value={stats.prontos}
            bgColor="bg-blue-50"
            textColor="text-blue-600"
            borderColor="border-blue-100"
            iconColor="bg-blue-100 text-blue-600"
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="FATURAMENTO"
            value={formatarMoeda(stats.faturamento)}
            bgColor="bg-red-50"
            textColor="text-red-600"
            borderColor="border-red-100"
            iconColor="bg-red-100 text-red-600"
            icon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 lg:ml-auto">
          {/* Auto-refresh toggle */}
          <button
            onClick={onAutoRefreshToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
              autoRefresh
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
            }`}
            title={autoRefresh ? "Desativar atualização automática" : "Ativar atualização automática"}
          >
            {autoRefresh ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{autoRefresh ? "Auto" : "Manual"}</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Atualizar agora"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, bgColor, textColor, borderColor, iconColor, icon }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm ${bgColor} ${borderColor}`}>
      <span className={`p-1.5 rounded-lg ${iconColor}`}>{icon}</span>
      <div className="min-w-[80px]">
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-bold ${textColor} whitespace-nowrap`}>{value}</p>
      </div>
    </div>
  );
}