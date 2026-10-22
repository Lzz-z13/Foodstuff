import { useState, useCallback, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import KanbanColumn from "./KanbanColumn";
import api from "../../services/axios";
import Snackbar from "../../components/snackBar/SnackBar";

/**
 * Transições permitidas na KDS.
 * A cozinha pode voltar um passo para corrigir enganos.
 */
const VALID_TRANSITIONS = {
  PENDING: ["PREPARING"],
  PREPARING: ["PENDING", "READY"],
  READY: ["PREPARING", "DELIVERED"],
  DELIVERED: ["READY"],
};

const STATUS_NAMES = {
  PENDING: "Novos Pedidos",
  PREPARING: "Em Preparo",
  READY: "Prontos",
  DELIVERED: "Entregues",
};

export default function KitchenKanban({
  initialOrders = [],
  onStatusChange,
  loading = false,
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [snackbar, setSnackbar] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const updateOrderStatus = useCallback(
    async (orderId, newStatus) => {
      const order = orders.find((o) => o.order_id === orderId);
      if (!order) return false;

      const currentStatus = order.status;
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

      if (!allowed.includes(newStatus)) {
        setSnackbar({
          message: `Não é possível mover de "${STATUS_NAMES[currentStatus]}" para "${STATUS_NAMES[newStatus]}".`,
          type: "warning",
        });
        return false;
      }

      // Atualização otimista
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId ? { ...o, status: newStatus } : o
        )
      );

      try {
        if (onStatusChange) {
          const ok = await onStatusChange(orderId, newStatus);
          if (ok === false) {
            setOrders((prev) =>
              prev.map((o) =>
                o.order_id === orderId ? { ...o, status: currentStatus } : o
              )
            );
            return false;
          }
        } else {
          await api.patchOrderStatus(orderId, newStatus);
        }
        return true;
      } catch (error) {
        setOrders((prev) =>
          prev.map((o) =>
            o.order_id === orderId ? { ...o, status: currentStatus } : o
          )
        );
        setSnackbar({
          message:
            error?.response?.data?.message || "Erro ao atualizar status",
          type: "error",
        });
        return false;
      }
    },
    [orders, onStatusChange]
  );

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;

      if (!over) return;

      const targetStatus = String(over.id);
      const orderId = Number(active.id);

      if (targetStatus === orderId) return;

      await updateOrderStatus(orderId, targetStatus);
    },
    [updateOrderStatus]
  );

  const byStatus = {
    PENDING: orders.filter((o) => o.status === "PENDING"),
    PREPARING: orders.filter((o) => o.status === "PREPARING"),
    READY: orders.filter((o) => o.status === "READY"),
  };

  return (
    <div className="h-full">
      {snackbar && (
        <Snackbar
          isOpen={true}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orders.map((o) => o.order_id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            <KanbanColumn
              status="PENDING"
              orders={byStatus.PENDING}
              onStatusChange={updateOrderStatus}
              isLoading={loading}
            />
            <KanbanColumn
              status="PREPARING"
              orders={byStatus.PREPARING}
              onStatusChange={updateOrderStatus}
              isLoading={loading}
            />
            <KanbanColumn
              status="READY"
              orders={byStatus.READY}
              onStatusChange={updateOrderStatus}
              isLoading={loading}
            />
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
