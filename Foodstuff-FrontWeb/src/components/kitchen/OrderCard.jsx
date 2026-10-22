import { GripVertical, Clock, AlertTriangle, ChefHat, CheckCircle, Truck } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STATUS_LABEL = {
  PENDING: "NOVO",
  PREPARING: "EM PREPARO",
  READY: "PRONTO",
  DELIVERED: "ENTREGUE",
  CANCELLED: "CANCELADO",
};

const STATUS_BADGE = {
  PENDING: "bg-amber-100 text-amber-700",
  PREPARING: "bg-cyan-100 text-cyan-700",
  READY: "bg-green-100 text-green-700",
  DELIVERED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const BUTTON_CONFIG = {
  PENDING: {
    label: "Iniciar Preparo",
    icon: ChefHat,
    className: "bg-amber-500 hover:bg-amber-600 text-white",
    nextStatus: "PREPARING",
  },
  PREPARING: {
    label: "Marcar Pronto",
    icon: CheckCircle,
    className: "bg-cyan-500 hover:bg-cyan-600 text-white",
    nextStatus: "READY",
  },
  READY: {
    label: "Entregar",
    icon: Truck,
    className: "bg-green-500 hover:bg-green-600 text-white",
    nextStatus: "DELIVERED",
  },
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
    .join(" · ");
}

export default function OrderCard({
  order,
  onStatusChange,
  isDragging,
}) {
  const config = BUTTON_CONFIG[order.status] || null;
  const canTransition = !!config;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: localIsDragging,
  } = useSortable({ id: order.order_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = order.status === "READY" || order.status === "DELIVERED";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl border bg-white p-4 shadow-sm transition-all duration-200 ${
        isDragging
          ? "shadow-xl ring-2 ring-[#ff5a47] rotate-1 scale-102 z-50"
          : "hover:shadow-md"
      } ${localIsDragging ? "ring-2 ring-[#ff5a47]" : ""}`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 touch-none"
        aria-label="Arrastar pedido"
      >
        <GripVertical size={20} />
      </div>

      {/* Header: ID + Mesa + Horário */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-bold text-slate-800 text-lg">#{order.order_id}</span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {order.table_label || `Mesa ${order.table_number}`}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
            <Clock size={12} />
            {typeof order.created_at === "string" && order.created_at.length <= 5
              ? order.created_at
              : String(order.created_at ?? "").slice(11, 16) || "--:--"}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="mb-3">
        <p className="text-sm text-slate-600 line-clamp-2">{resumoItens(order)}</p>
      </div>

      {/* Observations - Highlighted */}
      {order.observations && (
        <div className="mb-3 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-medium">{order.observations}</p>
          </div>
        </div>
      )}

      {/* Footer: Total + Action Button / Status Badge */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="font-bold text-slate-900 text-lg">{formatarMoeda(order.total)}</span>

        {canTransition ? (
          <button
            onClick={() => onStatusChange(order.order_id, config.nextStatus)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${config.className}`}
            disabled={isDragging}
          >
            <config.icon size={14} />
            {config.label}
          </button>
        ) : (
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[order.status] ?? "bg-slate-100 text-slate-600"}`}>
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        )}
      </div>

      {/* Origin indicator */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          {order.origin === "CUSTOMER" ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              App Mesa
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Garçom
            </>
          )}
        </span>
        <span>Comanda: #{order.command_id ?? "—"}</span>
      </div>
    </div>
  );
}