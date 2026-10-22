import { useDroppable } from "@dnd-kit/core";
import { Inbox, ChefHat, CheckCircle2, Loader2 } from "lucide-react";

import OrderCard from "./OrderCard";

const COLUMN_CONFIG = {
  PENDING: {
    id: "PENDING",
    title: "Novos Pedidos",
    subtitle: "Aguardando início",
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
    EmptyIcon: Inbox,
    emptyText: "Nenhum pedido novo",
    emptyHint: "Os pedidos recebidos aparecem aqui",
  },
  PREPARING: {
    id: "PREPARING",
    title: "Em Preparo",
    subtitle: "Cozinhando agora",
    dot: "bg-sky-400",
    badge: "bg-sky-100 text-sky-700",
    EmptyIcon: ChefHat,
    emptyText: "Nada no fogo",
    emptyHint: "Arraste um card para começar",
  },
  READY: {
    id: "READY",
    title: "Prontos",
    subtitle: "Aguardando entrega",
    dot: "bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    EmptyIcon: CheckCircle2,
    emptyText: "Nenhum pedido pronto",
    emptyHint: "Arraste um card para cá",
  },
};

export default function KanbanColumn({
  status,
  orders,
  onStatusChange,
  isLoading = false,
}) {
  const config = COLUMN_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: config.id });
  const EmptyIcon = config.EmptyIcon;

  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {/* Cabeçalho da coluna */}
      <header className="mb-3.5 flex items-center gap-2.5 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${config.dot} shadow-[0_0_0_3px_rgba(255,255,255,0.9)]`} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-extrabold uppercase tracking-wide text-slate-800">
            {config.title}
          </h3>
          <p className="truncate text-[11.5px] font-medium text-slate-400">
            {config.subtitle}
          </p>
        </div>

        <span
          className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-2.5 text-[13px] font-extrabold ${config.badge}`}
        >
          {orders.length}
        </span>
      </header>

      {/* Área dropável */}
      <div
        ref={setNodeRef}
        className={`flex min-h-[220px] flex-1 flex-col gap-3 rounded-2xl p-2.5 transition-all duration-200 ${
          isOver
            ? "bg-[#FF5F38]/8 ring-2 ring-inset ring-[#FF5F38]/40"
            : "bg-slate-200/40"
        }`}
      >
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
              <EmptyIcon size={20} />
            </span>
            <p className="text-[13px] font-semibold text-slate-400">
              {config.emptyText}
            </p>
            <p className="max-w-[180px] text-[11.5px] leading-snug text-slate-300">
              {config.emptyHint}
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.order_id}
              order={order}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </section>
  );
}
