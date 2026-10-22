import { useDroppable } from "@dnd-kit/core";
import { Inbox, ChefHat, CheckCircle, Loader2, AlertTriangle, Clock, Truck } from "lucide-react";

const COLUMN_CONFIG = {
  PENDING: {
    id: "PENDING",
    emptyIcon: Inbox,
    emptyText: "Nenhum pedido novo",
    timeColor: "text-emerald-600",
    badgeBg: "bg-[#FFF0EC]",
    badgeText: "text-[#FF5F38]",
    borderColor: "border-[#FF5F38]/20",
    cardBorder: "border-gray-200",
  },
  PREPARING: {
    id: "PREPARING",
    emptyIcon: ChefHat,
    emptyText: "Nada no fogo",
    timeColor: "text-[#FF5F38]",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-600",
    borderColor: "border-emerald-200",
    cardBorder: "border-gray-200",
  },
  READY: {
    id: "READY",
    emptyIcon: CheckCircle,
    emptyText: "Nenhum pedido pronto",
    timeColor: "text-emerald-600",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-600",
    borderColor: "border-blue-200",
    cardBorder: "border-gray-200",
  },
};

const EMPTY_ICONS = {
  inbox: Inbox,
  chef: ChefHat,
  check: CheckCircle,
};

export default function KanbanColumn({
  status,
  title,
  orders,
  onStatusChange,
  isLoading = false,
  columnColor,
  buttonColor,
  buttonText,
  emptyIcon,
  emptyText,
}) {
  const config = COLUMN_CONFIG[status];
  const count = orders.length;
  const EmptyIcon = EMPTY_ICONS[emptyIcon] || Inbox;

  const {
    setNodeRef,
    isOver,
  } = useDroppable({ id: config.id });

  const isDragOver = isOver;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full min-w-0 flex-1 rounded-2xl bg-white border transition-colors duration-200 ${config.borderColor} ${isDragOver ? "ring-2 ring-[#FF5F38] shadow-xl" : "shadow-sm"}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-extrabold text-base text-gray-900 uppercase tracking-wide">{title}</h3>
        <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${config.badgeBg} ${config.badgeText}`}>
          {count}
        </span>
      </div>

      {/* Orders List - Droppable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300">
            <EmptyIcon className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm font-medium text-gray-400">{emptyText}</p>
            <p className="text-xs text-gray-300">Arraste pedidos para cá</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.order_id}
              order={order}
              onStatusChange={onStatusChange}
              buttonColor={buttonColor}
              buttonText={buttonText}
              timeColor={config.timeColor}
              cardBorder={config.cardBorder}
              showObservation={status === "PENDING" || status === "PREPARING"}
            />
          ))
        )}

        {/* Drop Zone Indicator */}
        {isDragOver && orders.length === 0 && (
          <div className="mx-2 mb-2 p-4 rounded-xl border-2 border-dashed border-[#FF5F38] bg-[#FFF0EC]">
            <p className="text-center text-sm font-medium text-[#FF5F38]">
              Solte aqui para mover
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// OrderCard Component
function OrderCard({
  order,
  onStatusChange,
  buttonColor,
  buttonText,
  timeColor,
  cardBorder,
  showObservation = true,
}) {
  const config = {
    PENDING: {
      label: "NOVO",
      nextStatus: "PREPARING",
    },
    PREPARING: {
      label: "EM PREPARO",
      nextStatus: "READY",
    },
    READY: {
      label: "PRONTO",
      nextStatus: "DELIVERED",
    },
  };

  const statusConfig = config[order.status] || { label: order.status, nextStatus: null };

  function formatarMoeda(valor) {
    return Number(valor ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const timeDisplay = typeof order.created_at === "string" && order.created_at.length <= 5
    ? order.created_at
    : String(order.created_at ?? "").slice(11, 16) || "--:--";

  return (
    <div className={`relative flex flex-col rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md ${cardBorder} bg-white`}>
      {/* Card Content */}
      <div className="p-5 space-y-4">
        {/* Header: Order Number + Time */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg text-gray-900">#{order.order_id}</span>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className={`font-semibold text-sm ${timeColor}`}>{timeDisplay}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Items List */}
        <div className="space-y-3">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-gray-900 w-6 text-right">{item.quantity}x</span>
                <span className="font-medium text-base text-gray-900 flex-1 truncate">{item.product_name}</span>
              </div>
              {item.observation && (
                <p className="ml-8 text-sm font-medium text-[#FF5F38]">⚠ {item.observation}</p>
              )}
            </div>
          ))}
        </div>

        {/* Special Instructions */}
        {showObservation && order.observations && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 font-medium">{order.observations}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {statusConfig.nextStatus && (
          <button
            onClick={() => onStatusChange(order.order_id, statusConfig.nextStatus)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-white transition-colors ${buttonColor}`}
            disabled={false}
          >
            {statusConfig.nextStatus === "PREPARING" && <ChefHat className="h-4 w-4" />}
            {statusConfig.nextStatus === "READY" && <CheckCircle className="h-4 w-4" />}
            {statusConfig.nextStatus === "DELIVERED" && <Truck className="h-4 w-4" />}
            {buttonText}
          </button>
        )}

        {!statusConfig.nextStatus && (
          <div className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{statusConfig.label}</span>
          </div>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="px-4 py-2 bg-gray-50 rounded-b-xl border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          {order.origin === "CUSTOMER" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              App Mesa
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Garçom
            </>
          )}
        </span>
        <span>Comanda: #{order.command_id ?? "—"}</span>
      </div>
    </div>
  );
}