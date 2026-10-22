import { useState, useEffect, useCallback } from "react";
import { X, Loader2 } from "lucide-react";
import KitchenKanban from "../../components/kitchen/KitchenKanban";
import KitchenHeader from "../../components/kitchen/KitchenHeader";
import api from "../../services/axios";
import Snackbar from "../../components/snackBar/SnackBar";

function normalizarPedidos(payload) {
  const lista = Array.isArray(payload) ? payload : payload?.data ?? [];
  if (!Array.isArray(lista)) return [];
  return lista.map((o) => ({
    order_id: o.order_id ?? o.id,
    table_number: o.table_number ?? o.table_id ?? null,
    table_label:
      o.table_label ??
      (o.table_number || o.table_id
        ? `Mesa T-${String(o.table_number ?? o.table_id).padStart(2, "0")}`
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
  const [usingMock, setUsingMock] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMockBanner, setShowMockBanner] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      let isMock = false;

      if (typeof api.getAllOrders === "function") {
        try {
          response = await api.getAllOrders();
        } catch (apiError) {
          console.warn("API getAllOrders failed, using mock:", apiError);
          response = null;
        }
      }

      if (response?.data) {
        const lista = normalizarPedidos(response.data);
        setOrders(lista);
        setUsingMock(false);
      } else {
        isMock = true;
        await new Promise((r) => setTimeout(r, 350));
        setOrders(MOCK_ORDERS);
        setUsingMock(true);
      }
      setShowMockBanner(isMock);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      setOrders(MOCK_ORDERS);
      setUsingMock(true);
      setShowMockBanner(true);
      setSnackbar({
        message:
          error?.response?.data?.message ||
          "API indisponível. Exibindo dados de exemplo.",
        type: "info",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (!refreshing) {
      setRefreshing(true);
      fetchOrders();
    }
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

  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    try {
      await api.patchOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId ? { ...o, status: newStatus } : o
        )
      );
      setSnackbar({
        message: `Pedido #${orderId} atualizado`,
        type: "success",
      });
    } catch (error) {
      setSnackbar({
        message: error?.response?.data?.message || "Erro ao atualizar",
        type: "error",
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#D9D9D9] flex">
      {/* Main Content */}
      <div className="flex-1 lg:ml-64 min-w-0 flex flex-col">
        {/* Top Nav Bar */}
        <header className="fixed top-0 left-64 right-0 z-40 h-14 bg-white border-b border-white lg:left-64">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Brand Block */}
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 relative">
                <svg className="h-5 w-5 text-[#FF5533]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="font-extrabold text-xl text-gray-900 tracking-tight">Foodstuff</span>
            </div>

            {/* System Status + Clock */}
            <div className="flex items-center gap-6">
              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-sm text-gray-900">Sistema Online</span>
              </div>

              <div className="h-4 w-px bg-gray-300" />

              {/* Clock */}
              <div className="flex items-center gap-2">
                <svg className="h-4.5 w-4.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span id="clock-time" className="font-bold text-sm text-gray-900 tabular-nums">--:--:--</span>
              </div>
            </div>
          </div>
        </header>

        {/* Mock Banner */}
        {usingMock && showMockBanner && (
          <div className="fixed top-14 left-64 right-0 z-30 bg-amber-50 border-b border-amber-200 px-6 py-2 lg:left-64">
            <p className="text-sm text-amber-800 text-center">
              <span className="font-medium">Modo demonstração:</span> Backend sem GET de pedidos — exibindo dados de exemplo. Atualização automática a cada 30s.
            </p>
          </div>
        )}

        {/* Snackbar */}
        {snackbar && (
          <Snackbar
            isOpen={true}
            message={snackbar.message}
            type={snackbar.type}
            onClose={() => setSnackbar(null)}
          />
        )}

        {/* Kitchen Header (Stats Bar) */}
        <KitchenHeader
          orders={orders}
          onRefresh={handleRefresh}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={handleAutoRefreshToggle}
          refreshing={refreshing}
        />

        {/* Main Kanban Board */}
        <main className="flex-1 overflow-auto pt-20 lg:pt-20">
          <KitchenKanban
            initialOrders={orders}
            onStatusChange={handleStatusChange}
            loading={loading}
          />
        </main>
      </div>

      {/* Clock Script */}
      <script dangerouslySetInnerHTML={{
        __html: `
          function updateClock() {
            const el = document.getElementById('clock-time');
            if (el) {
              const now = new Date();
              el.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
          }
          updateClock();
          setInterval(updateClock, 1000);
        `
      }} />
    </div>
  );
}