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

const VALID_TRANSITIONS = {
  PENDING: ["PREPARING"],
  PREPARING: ["PENDING", "READY"],
  READY: ["PREPARING", "DELIVERED"],
  DELIVERED: [],
};

export default function KitchenKanban({ initialOrders = [], onStatusChange, loading = false }) {
  const [orders, setOrders] = useState(initialOrders);
  const [snackbar, setSnackbar] = useState(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update orders when initialOrders change
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Update order status via API
  const updateOrderStatus = useCallback(
    async (orderId, newStatus) => {
      const order = orders.find((o) => o.order_id === orderId);
      if (!order) return;

      const currentStatus = order.status;
      const allowed = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowed.includes(newStatus)) {
        setSnackbar({
          message: `Não é possível mover de ${currentStatus} para ${newStatus}`,
          type: "warning",
        });
        return false;
      }

      // Optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId ? { ...o, status: newStatus } : o
        )
      );

      try {
        if (onStatusChange) {
          await onStatusChange(orderId, newStatus);
        } else {
          await api.patchOrderStatus(orderId, newStatus);
        }
        setSnackbar({
          message: `Pedido #${orderId} → ${newStatus}`,
          type: "success",
        });
        return true;
      } catch (error) {
        // Rollback on error
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

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const targetStatus = over.id;
      const orderId = Number(active.id);

      await updateOrderStatus(orderId, targetStatus);
    },
    [updateOrderStatus]
  );

  // Group orders by status
  const ordersByStatus = {
    PENDING: orders.filter((o) => o.status === "PENDING"),
    PREPARING: orders.filter((o) => o.status === "PREPARING"),
    READY: orders.filter((o) => o.status === "READY"),
    DELIVERED: orders.filter((o) => o.status === "DELIVERED"),
  };

  return (
    <div className="h-full flex flex-col">
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
          <div className="flex-1 p-6 lg:p-8">
            <div className="flex gap-6 lg:gap-8 h-full min-h-0">
              {/* Column: NOVOS PEDIDOS (PENDING) */}
              <KanbanColumn
                status="PENDING"
                title="NOVOS PEDIDOS"
                orders={ordersByStatus.PENDING}
                onStatusChange={updateOrderStatus}
                isLoading={loading}
                columnColor="orange"
                buttonColor="bg-[#FF5F38] hover:bg-[#FF5F38]/90"
                buttonText="INICIAR PREPARO"
                emptyIcon="inbox"
                emptyText="Nenhum pedido novo"
              />

              {/* Column: EM PREPARO (PREPARING) */}
              <KanbanColumn
                status="PREPARING"
                title="EM PREPARO"
                orders={ordersByStatus.PREPARING}
                onStatusChange={updateOrderStatus}
                isLoading={loading}
                columnColor="emerald"
                buttonColor="bg-emerald-500 hover:bg-emerald-600"
                buttonText="MARCAR PRONTO"
                emptyIcon="chef"
                emptyText="Nada no fogo"
              />

              {/* Column: PRONTOS (READY) */}
              <KanbanColumn
                status="READY"
                title="PRONTOS PARA ENTREGA"
                orders={ordersByStatus.READY}
                onStatusChange={updateOrderStatus}
                isLoading={loading}
                columnColor="blue"
                buttonColor="bg-white border border-[#FF5F38] text-gray-600 hover:bg-gray-50"
                buttonText="ENTREGUE"
                emptyIcon="check"
                emptyText="Nenhum pedido pronto"
              />
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}