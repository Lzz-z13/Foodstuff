import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import Header from "../../components/header/Header";
import Navbar from "../../components/navbar/Navbar";

import StatCard from "../../components/statCard/StatCard";
import WeeklyRevenueChart from "../../components/weeklyrevenuechart/WeeklyRevenueChart";
import CategoryChart from "../../components/categorychart/CategoryChart";
import BestSellingChart from "../../components/bestsellingchart/BestSellingChart";
import RecentOrders from "../../components/recentorders/RecentOrders";

import sheets from "../../services/api";

const COLORS = {
  primary: "#FF6B2C",
  background: "#F5F6F8",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
  error: "#EF4444",
};

// ─── Helpers de adaptação API → componentes ────────────────────────────────

function formatarMoeda(valor) {
  return `R$ ${Number(valor ?? 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function adaptarResumo(resumo) {
  const {
    faturamentoDia = 0,
    pedidosHoje = 0,
    ticketMedio = 0,
    mesasAtivas = null,
  } = resumo ?? {};

  return [
    {
      title: "Faturamento",
      value: formatarMoeda(faturamentoDia),
      change: "hoje",
      icon: "cash-outline",
      positive: true,
    },
    {
      title: "Pedidos",
      value: String(pedidosHoje),
      change: "hoje",
      icon: "receipt-outline",
      positive: true,
    },
    {
      title: "Ticket médio",
      value: formatarMoeda(ticketMedio),
      change: "hoje",
      icon: "trending-up-outline",
      positive: true,
    },
    {
      title: "Mesas ativas",
      value: mesasAtivas != null ? String(mesasAtivas).padStart(2, "0") : "—",
      change: "agora",
      icon: "restaurant-outline",
      positive: true,
    },
  ];
}

// API: [{ dia, valor }]  →  gifted-charts: [{ value, label }]
function adaptarFaturamentoSemanal(dados = []) {
  return dados.map((item) => ({
    value: Number(item.valor ?? 0),
    label: item.dia ?? "",
  }));
}

// API: [{ nome, quantidade, cor }]  →  CategoryChart: [{ value, color, text }]
function adaptarCategorias(dados = []) {
  const total = dados.reduce((s, i) => s + Number(i.quantidade ?? 0), 0);
  return dados.map((item) => ({
    text: item.nome ?? "",
    value: total > 0 ? Math.round((Number(item.quantidade) / total) * 100) : 0,
    color: item.cor ?? COLORS.primary,
  }));
}

// API: [{ nome, quantidade }]  →  gifted-charts BarChart: [{ value, label }]
function adaptarMaisVendidos(dados = []) {
  return dados.map((item) => ({
    value: Number(item.quantidade ?? 0),
    label: item.nome ?? "",
  }));
}

// API: [{ pedido, mesa, itens, valor, status, hora }]
//   →  RecentOrders: [{ id, table, items, total, status }]
function adaptarPedidosRecentes(dados = []) {
  const contarItens = (itensStr = "") => {
    if (!itensStr) return 0;
    return itensStr.split(",").reduce((soma, parte) => {
      const match = parte.trim().match(/^(\d+)x /);
      return soma + (match ? Number(match[1]) : 1);
    }, 0);
  };

  return dados.map((order) => ({
    id: order.pedido ?? "—",
    table: order.mesa ?? "—",
    items: contarItens(order.itens),
    total: formatarMoeda(order.valor),
    status: order.status ?? "—",
  }));
}

// ─── Tela Dashboard ────────────────────────────────────────────────────────

export default function Dashboard({ navigation }) {
  const [user, setUser] = useState(null);

  const [dashboardStats, setDashboardStats] = useState([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [bestSelling, setBestSelling] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar usuário do SecureStore
  useEffect(() => {
    async function carregarUsuario() {
      try {
        const dados = await SecureStore.getItemAsync("user");
        if (dados) setUser(JSON.parse(dados));
      } catch (err) {
        console.log("Erro ao carregar usuário:", err);
      }
    }
    carregarUsuario();
  }, []);

  // Carregar dados do dashboard via API
  const carregarDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await sheets.getDashboard();
      const data = response.data?.data ?? {};

      setDashboardStats(adaptarResumo(data.resumo));
      setWeeklyRevenue(adaptarFaturamentoSemanal(data.faturamentoSemanal));
      setCategoryData(adaptarCategorias(data.pedidosPorCategoria));
      setBestSelling(adaptarMaisVendidos(data.maisVendidos));
      setRecentOrders(adaptarPedidosRecentes(data.pedidosRecentes));
    } catch (err) {
      console.log("Erro ao carregar dashboard:", err);
      setError("Não foi possível carregar os dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDashboard();
  }, [carregarDashboard]);

  const userName = user?.name || "Usuário";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.card}
      />

      {/* HEADER */}
      <Header navigation={navigation} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >

        {/* SAUDAÇÃO */}
        <View style={styles.greetingRow}>

          <View style={styles.greetingText}>
            <Text style={styles.greetingTitle}>
              Bom dia, {userName}
            </Text>

            <Text style={styles.greetingSubtitle}>
              Desempenho de hoje.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.calendarButton}
            activeOpacity={0.7}
            onPress={carregarDashboard}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={COLORS.textDark}
            />
          </TouchableOpacity>

        </View>

        {/* LOADING */}
        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Carregando dashboard…</Text>
          </View>
        )}

        {/* ERRO */}
        {!loading && error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={22} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={carregarDashboard}
              activeOpacity={0.7}
            >
              <Text style={styles.retryText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CONTEÚDO */}
        {!loading && !error && (
          <>
            {/* ESTATÍSTICAS */}
            <View style={styles.statsGrid}>
              {dashboardStats.map((item) => (
                <StatCard
                  key={item.title}
                  {...item}
                />
              ))}
            </View>

            {/* GRÁFICO DE FATURAMENTO */}
            {weeklyRevenue.length > 0 && (
              <WeeklyRevenueChart data={weeklyRevenue} />
            )}

            {/* GRÁFICO DE CATEGORIAS */}
            {categoryData.length > 0 && (
              <CategoryChart data={categoryData} />
            )}

            {/* MAIS VENDIDOS */}
            {bestSelling.length > 0 && (
              <BestSellingChart data={bestSelling} />
            )}

            {/* PEDIDOS RECENTES */}
            {recentOrders.length > 0 && (
              <RecentOrders orders={recentOrders} />
            )}
          </>
        )}

      </ScrollView>

      {/* NAVBAR */}
      <Navbar
        navigation={navigation}
        activeTab="Dashboard"
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  greetingText: {
    flex: 1,
  },

  greetingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  greetingSubtitle: {
    fontSize: 12,
    color: COLORS.textGray,
    marginTop: 3,
  },

  calendarButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },

  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },

  loadingText: {
    fontSize: 13,
    color: COLORS.textGray,
  },

  errorBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 10,
  },

  errorText: {
    fontSize: 13,
    color: COLORS.textGray,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },

  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});