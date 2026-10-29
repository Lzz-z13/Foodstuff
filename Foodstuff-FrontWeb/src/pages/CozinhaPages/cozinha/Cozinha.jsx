import { useState, useEffect, useCallback } from "react";
import { ChefHat, Clock3 } from "lucide-react";

import KitchenKanban from "../../../components/kitchen/KitchenKanban";
import api from "../../../services/axios";
import Snackbar from "../../../components/snackBar/SnackBar";
import { lerUsuario } from "../../../services/auth";

function normalizarPedidos(payload) {
  const lista = Array.isArray(payload) ? payload : payload?.data ?? [];
  if (!Array.isArray(lista)) return [];
  return lista.map((o) => ({
    order_id: o.order_id ?? o.id,
    table_number: o.table_number ?? o.table_id ?? null,
    table_label:
      o.table_label ??
      (o.table_number || o.table_id
        ? `Mesa ${String(o.table_number ?? o.table_id).padStart(2, "0")}`
        : "Mesa —"),
    origin: o.origin ?? "WAITER",
    origin_label: o.origin_label ?? null,
    status: o.status ?? "PENDING",
    observations: o.observations ?? o.observation ?? null,
    created_at: o.created_at ?? o.horario ?? "--:--",
    started_at: o.started_at ?? null,
    finished_at: o.finished_at ?? null,
    total:
      o.total ??
      (Array.isArray(o.items)
        ? o.items.reduce(
            (s, i) => s + Number(i.quantity ?? 1) * Number(i.unit_price ?? 0),
            0
          )
        : 0),
    items: Array.isArray(o.items)
      ? o.items.map((i) => ({
          quantity: i.quantity ?? 1,
          product_name: i.product_name ?? i.name ?? "Item",
          unit_price: Number(i.unit_price ?? i.price ?? 0),
          observation: i.observation ?? null,
        }))
      : [],
    command_id: o.command_id ?? null,
  }));
}

export default function Cozinha() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    setUser(lerUsuario());
  }, []);

  // Relógio
  useEffect(() => {
    const interval = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAllOrders();
      const lista = normalizarPedidos(response?.data);
      setOrders(lista);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      setOrders([]);
      setSnackbar({
        message:
          error?.response?.data?.message ||
          "Não foi possível carregar os pedidos. Verifique a conexão com a API.",
        type: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders, refreshing]);

  const handleAutoRefreshToggle = useCallback(() => {
    setAutoRefresh((prev) => !prev);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  const handleStatusChange = useCallback(
    async (orderId, newStatus) => {
      try {
        await api.patchOrderStatus(orderId, newStatus);

        setOrders((prev) =>
          prev.map((o) =>
            o.order_id === orderId ? { ...o, status: newStatus } : o
          )
        );

        setSnackbar({
          message: `Pedido #${orderId} atualizado com sucesso.`,
          type: "success",
        });
        return true;
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        setSnackbar({
          message:
            error?.response?.data?.message ||
            "Não foi possível atualizar o status do pedido.",
          type: "error",
        });
        // Recarrega para voltar ao estado real do servidor
        fetchOrders();
        return false;
      }
    },
    [fetchOrders]
  );

  const primeiroNome = user?.name?.split(" ")[0] || "Cozinheiro";
  const hora = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const data = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {snackbar && (
        <Snackbar
          isOpen={true}
          message={snackbar.message}
          type={snackbar.type}
          onClose={() => setSnackbar(null)}
        />
      )}

      <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <KitchenKanban
          initialOrders={orders}
          onStatusChange={handleStatusChange}
          loading={loading}
        />
      </main>
    </div>
  );
}
