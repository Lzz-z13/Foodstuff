import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Header from "../../components/header/Header";
import Navbar from "../../components/navbar/Navbar";
import sheets from "../../services/api";

const REFRESH_INTERVAL = 10000;

// ─── Design tokens ─────────────────────────────────────────────────────────
const C = {
  primary: "#FF6B2C",
  primaryLight: "#FFF1EA",
  bg: "#F5F6F8",
  card: "#FFFFFF",
  dark: "#1F2024",
  gray: "#8B8D98",
  border: "#ECEDF0",
  green: "#16A34A",
  greenBg: "#EAF8EF",
  red: "#EF4444",
  redBg: "#FEE2E2",
  yellow: "#D97706",
  yellowBg: "#FFF5E5",
  blue: "#2563EB",
  blueBg: "#DBEAFE",
  slate: "#6B7280",
  slateBg: "#E5E7EB",
};

// ─── Status ────────────────────────────────────────────────────────────────
const STATUS = {
  PENDING: { label: "Pendente", bg: C.yellowBg, color: C.yellow },
  PREPARING: { label: "Em preparo", bg: C.blueBg, color: C.blue },
  READY: { label: "Pronto", bg: C.greenBg, color: C.green },
  DELIVERED: { label: "Entregue", bg: C.slateBg, color: C.slate },
  CANCELLED: { label: "Cancelado", bg: C.redBg, color: C.red },
};

const FILTROS = [
  { key: "todos", label: "Todos", statuses: null },
  { key: "afazer", label: "A fazer", statuses: ["PENDING", "PREPARING"] },
  { key: "prontos", label: "Prontos", statuses: ["READY"] },
  { key: "entregues", label: "Entregues", statuses: ["DELIVERED"] },
  { key: "cancelados", label: "Cancelados", statuses: ["CANCELLED"] },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatMoeda(v) {
  return `R$ ${Number(v ?? 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function lerData(valor) {
  if (!valor) return null;

  if (typeof valor === "string") {
    const limpo = valor.trim();

    // DATETIME do MySQL (sem fuso) é tratado como horário de Brasília.
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(limpo)) {
      const data = new Date(`${limpo.replace(" ", "T")}-03:00`);
      return Number.isNaN(data.getTime()) ? null : data;
    }

    const data = new Date(limpo);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarHora(valor) {
  const data = lerData(valor);
  if (!data) return "";
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function tempoDecorrido(valor) {
  const data = lerData(valor);
  if (!data) return "—";

  const minutos = Math.max(0, Math.floor((Date.now() - data.getTime()) / 60000));

  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  return `há ${dias} d`;
}

function normalizarPedido(pedido) {
  const itensBrutos = Array.isArray(pedido.items)
    ? pedido.items
    : Array.isArray(pedido.itens)
      ? pedido.itens
      : [];

  const items = itensBrutos.map((item) => ({
    quantity: Number(item.quantity ?? item.quantidade ?? 1),
    product_name: item.product_name ?? item.name ?? item.nome ?? "Item",
    unit_price: Number(item.unit_price ?? item.price ?? item.preco ?? 0),
    observation: item.observation ?? item.observacao ?? null,
  }));

  const totalCalculado = items.reduce(
    (soma, item) => soma + item.quantity * item.unit_price,
    0,
  );

  return {
    ...pedido,
    order_id: pedido.order_id ?? pedido.id,
    status: String(pedido.status || "PENDING").trim().toUpperCase(),
    table_number: pedido.table_number ?? pedido.mesa?.codigo ?? null,
    customer_name: pedido.customer_name ?? pedido.nome_cliente ?? "",
    items,
    total: Number(pedido.total ?? totalCalculado),
  };
}

// ─── Card de pedido ─────────────────────────────────────────────────────────
function OrderCard({ pedido }) {
  const status = STATUS[pedido.status] ?? STATUS.PENDING;
  const hora = formatarHora(pedido.created_at);
  const itensVisiveis = pedido.items.slice(0, 4);
  const itensRestantes = pedido.items.length - itensVisiveis.length;

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderIconWrap}>
        <Ionicons name="receipt-outline" size={22} color={C.primary} />
      </View>

      <View style={styles.orderInfo}>
        <View style={styles.orderTopRow}>
          <Text style={styles.orderTitle}>
            Mesa {pedido.table_number ?? "—"}
          </Text>

          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.orderMeta} numberOfLines={1}>
          Pedido #{pedido.order_id}
          {pedido.customer_name ? ` • ${pedido.customer_name}` : ""}
        </Text>

        <Text style={styles.orderTime}>
          {hora ? `${hora} • ` : ""}
          {tempoDecorrido(pedido.created_at)}
        </Text>

        <View style={styles.itemsBox}>
          {itensVisiveis.length ? (
            itensVisiveis.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text style={styles.itemPrice}>
                  {formatMoeda(item.quantity * item.unit_price)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.itemEmpty}>Nenhum item informado.</Text>
          )}

          {itensRestantes > 0 && (
            <Text style={styles.itemMore}>
              + {itensRestantes} item{itensRestantes !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        {pedido.observations ? (
          <View style={styles.obsBox}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={12}
              color={C.yellow}
            />
            <Text style={styles.obsText} numberOfLines={2}>
              {pedido.observations}
            </Text>
          </View>
        ) : null}

        <View style={styles.orderBottom}>
          <Text style={styles.orderTotal}>{formatMoeda(pedido.total)}</Text>
          <Text style={styles.orderOrigin}>
            {pedido.origin === "CUSTOMER"
              ? "Cliente"
              : pedido.origin === "WAITER"
                ? "Garçom"
                : ""}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Tela Principal ──────────────────────────────────────────────────────────
export default function Pedidos({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  const emAndamentoRef = useRef(false);
  const ativoRef = useRef(true);
  const primeiroFocoRef = useRef(true);

  const carregar = useCallback(async (silencioso = false) => {
    if (emAndamentoRef.current) return;
    emAndamentoRef.current = true;

    if (!silencioso) setLoading(true);

    try {
      const response = await sheets.getAllOrders();
      const lista = response.data?.data ?? response.data;

      if (!Array.isArray(lista)) {
        throw new Error("Formato inesperado na resposta da API.");
      }

      if (!ativoRef.current) return;

      setPedidos(lista.map(normalizarPedido));
      setError(null);
      setUltimaAtualizacao(new Date());
    } catch (err) {
      console.log("Erro ao carregar pedidos:", err?.response?.data ?? err);

      if (!ativoRef.current) return;
      setError("Não foi possível atualizar os pedidos.");
    } finally {
      emAndamentoRef.current = false;

      if (!ativoRef.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      ativoRef.current = true;

      if (primeiroFocoRef.current) {
        primeiroFocoRef.current = false;
        carregar(false);
      } else {
        carregar(true);
      }

      const interval = setInterval(() => carregar(true), REFRESH_INTERVAL);

      return () => {
        ativoRef.current = false;
        clearInterval(interval);
      };
    }, [carregar]),
  );

  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") carregar(true);
    });

    return () => subscription.remove();
  }, [carregar]);

  function atualizar() {
    setRefreshing(true);
    carregar(true);
  }

  const filtrados = useMemo(() => {
    const definicao = FILTROS.find((item) => item.key === filtro);
    const termo = search.trim().toLowerCase();

    return pedidos.filter((pedido) => {
      if (definicao?.statuses && !definicao.statuses.includes(pedido.status)) {
        return false;
      }

      if (!termo) return true;

      const texto = [
        pedido.order_id,
        pedido.command_id,
        pedido.table_number,
        pedido.customer_name,
        ...pedido.items.map((item) => item.product_name),
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(termo);
    });
  }, [pedidos, filtro, search]);

  function contar(statuses) {
    if (!statuses) return pedidos.length;
    return pedidos.filter((pedido) => statuses.includes(pedido.status)).length;
  }

  const subtitulo = ultimaAtualizacao
    ? `${filtrados.length} pedido${filtrados.length !== 1 ? "s" : ""} • atualizado ${formatarHora(ultimaAtualizacao)}`
    : `${filtrados.length} pedido${filtrados.length !== 1 ? "s" : ""}`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      <Header navigation={navigation} />

      {/* Título + Atualizar */}
      <View style={styles.topBar}>
        <View style={styles.topBarText}>
          <Text style={styles.pageTitle}>Pedidos</Text>
          <Text style={styles.pageSubtitle}>{subtitulo}</Text>
        </View>

        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Ao vivo</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={atualizar}
          activeOpacity={0.7}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={19} color={C.dark} />
          )}
        </TouchableOpacity>
      </View>

      {/* Barra de busca */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar pedido, mesa, cliente ou item..."
          placeholderTextColor={C.gray}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color={C.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTROS.map((item) => {
          const active = filtro === item.key;
          const quantidade = contar(item.statuses);

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFiltro(item.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {item.label} ({quantidade})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Aviso de falha na atualização */}
      {error && pedidos.length > 0 && (
        <View style={styles.warningBar}>
          <Ionicons name="alert-circle-outline" size={14} color={C.yellow} />
          <Text style={styles.warningText}>
            Falha ao atualizar. Exibindo a última atualização.
          </Text>
        </View>
      )}

      {/* Lista */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.centerText}>Carregando pedidos…</Text>
        </View>
      ) : error && pedidos.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={28} color={C.red} />
          <Text style={styles.centerText}>
            Não foi possível carregar os pedidos.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => carregar(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filtrados.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="receipt-outline" size={40} color={C.border} />
          <Text style={styles.emptyText}>Nenhum pedido encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(item) => String(item.order_id)}
          renderItem={({ item }) => <OrderCard pedido={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={atualizar}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
        />
      )}

      <Navbar navigation={navigation} activeTab="Pedidos" />
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Topo
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  topBarText: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.dark,
  },
  pageSubtitle: {
    fontSize: 12,
    color: C.gray,
    marginTop: 1,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: C.greenBg,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.green,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },

  // Busca
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.dark,
  },

  // Filtros
  filterScroll: {
    maxHeight: 44,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  filterChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: C.gray,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: C.card,
  },

  // Aviso
  warningBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.yellowBg,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: C.yellow,
    fontWeight: "600",
  },

  // Lista
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
  },

  // Card pedido
  orderCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 12,
  },
  orderIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  orderInfo: {
    flex: 1,
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  orderTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: C.dark,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  orderMeta: {
    fontSize: 11,
    color: C.dark,
    fontWeight: "600",
    marginTop: 2,
  },
  orderTime: {
    fontSize: 10,
    color: C.gray,
    marginTop: 1,
  },
  itemsBox: {
    marginTop: 8,
    gap: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemQty: {
    fontSize: 11,
    fontWeight: "800",
    color: C.primary,
    minWidth: 22,
  },
  itemName: {
    flex: 1,
    fontSize: 11,
    color: C.dark,
  },
  itemPrice: {
    fontSize: 11,
    color: C.gray,
    fontWeight: "600",
  },
  itemEmpty: {
    fontSize: 11,
    color: C.gray,
  },
  itemMore: {
    fontSize: 10,
    color: C.gray,
    fontWeight: "600",
    marginTop: 1,
  },
  obsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: C.yellowBg,
  },
  obsText: {
    flex: 1,
    fontSize: 10,
    color: C.yellow,
  },
  orderBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: C.dark,
  },
  orderOrigin: {
    fontSize: 10,
    fontWeight: "700",
    color: C.gray,
  },

  // Estados vazios / loading
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 60,
  },
  centerText: {
    fontSize: 13,
    color: C.gray,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: C.gray,
    textAlign: "center",
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: C.primary,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.card,
  },
});
