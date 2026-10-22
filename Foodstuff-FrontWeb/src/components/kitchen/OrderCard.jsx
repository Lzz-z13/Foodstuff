import { Clock, ChefHat, CheckCircle2, Truck, Flame, Bell, BellOff, RefreshCw, GripVertical, AlertTriangle, Package, ArrowRight } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ------------------------------------------------------------------ */
/* Configuração por status                                             */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG = {
  PENDING: {
    accent: "bg-amber-400",
    ring: "ring-amber-200",
    iconBg: "bg-amber-100 text-amber-700",
    Icon: Package,
    timeClass: "text-emerald-600",
    buttonClass:
      "bg-[#FF5F38] text-white hover:bg-[#F2542E] shadow-[0_2px_8px_rgba(255,95,56,0.32)]",
    buttonText: "Iniciar preparo",
    buttonIcon: ChefHat,
  },
  PREPARING: {
    accent: "bg-sky-400",
    ring: "ring-sky-200",
    iconBg: "bg-sky-100 text-sky-700",
    Icon: Flame,
    timeClass: "text-[#FF5F38]",
    buttonClass:
      "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_2px_8px_rgba(16,185,129,0.32)]",
    buttonText: "Marcar pronto",
    buttonIcon: CheckCircle2,
  },
  READY: {
    accent: "bg-emerald-400",
    ring: "ring-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-700",
    Icon: Truck,
    timeClass: "text-emerald-600",
    buttonClass:
      "bg-white text-slate-700 border border-slate-200 hover:border-[#FF5F38] hover:text-[#FF5F38] hover:bg-[#FFF0EC] shadow-sm",
    buttonText: "Marcar entregue",
    buttonIcon: CheckCircle2,
  },
  DELIVERED: {
    accent: "bg-slate-300",
    ring: "ring-slate-200",
    iconBg: "bg-slate-100 text-slate-500",
    Icon: CheckCircle2,
    timeClass: "text-slate-400",
    buttonClass: "",
    buttonText: "",
    buttonIcon: null,
  },
};

const FALLBACK = {
  accent: "bg-slate-300",
  ring: "ring-slate-200",
  iconBg: "bg-slate-100 text-slate-500",
  Icon: Package,
  timeClass: "text-slate-400",
  buttonClass: "",
  buttonText: "",
  buttonIcon: null,
};

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

function formatarMoeda(valor) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarHora(valor) {
  if (!valor) return "--:--";
  const texto = String(valor);
  if (texto.length <= 5) return texto;
  const parte = texto.slice(11, 16);
  return parte || "--:--";
}

export default function OrderCard({ order, onStatusChange }) {
  const config = STATUS_CONFIG[order.status] ?? FALLBACK;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.order_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ActionIcon = config.buttonIcon;
  const observacoes = order.observations;
  const obsItem = order.items?.find((i) => i.observation);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-all duration-200 ${
        isDragging
          ? "z-50 rotate-1 scale-[1.02] border-transparent shadow-[0_18px_40px_-8px_rgba(15,23,42,0.28)] ring-2 ring-[#FF5F38]/40"
          : "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_-6px_rgba(15,23,42,0.14)]"
      }`}
    >
      {/* Faixa de status */}
      <span className={`absolute inset-y-0 left-0 w-1 ${config.accent}`} />

      <div className="p-4 pl-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[17px] font-extrabold leading-none tracking-tight text-slate-900">
                #{order.order_id}
              </h4>
              {order.table_label && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {order.table_label}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Clock size={12} className="text-slate-400" />
              <span className={`text-[12px] font-semibold tabular-nums ${config.timeClass}`}>
                {formatarHora(order.created_at)}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-medium text-slate-400">
                {order.origin === "CUSTOMER" ? "App Mesa" : "Garçom"}
              </span>
            </div>
          </div>

          {/* Drag handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Arrastar pedido"
            className="-mr-1 -mt-1 cursor-grab touch-none rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
          >
            <GripVertical size={18} />
          </button>
        </div>

        {/* Itens */}
        <ul className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3.5">
          {order.items?.map((item, idx) => (
            <li key={idx} className="flex items-baseline gap-2">
              <span className="w-6 shrink-0 text-right text-[13px] font-extrabold text-slate-900">
                {item.quantity}x
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                {item.product_name}
              </span>
            </li>
          ))}
        </ul>

        {/* Observação */}
        {(observacoes || obsItem?.observation) && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#FF5F38]/15 bg-[#FFF0EC] px-3 py-2">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-[#FF5F38]" />
            <p className="text-[12.5px] font-medium leading-snug text-[#D4441F]">
              {observacoes || obsItem.observation}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[15px] font-extrabold tracking-tight text-slate-900">
            {formatarMoeda(order.total)}
          </span>

          {ActionIcon && (
            <button
              type="button"
              onClick={() => onStatusChange(order.order_id, proximoStatus(order.status))}
              className={`group/btn flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition-all active:scale-[0.97] ${config.buttonClass}`}
            >
              <ActionIcon size={14} className="transition-transform group-hover/btn:scale-110" />
              {config.buttonText}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function proximoStatus(status) {
  switch (status) {
    case "PENDING":
      return "PREPARING";
    case "PREPARING":
      return "READY";
    case "READY":
      return "DELIVERED";
    default:
      return status;
  }
}
