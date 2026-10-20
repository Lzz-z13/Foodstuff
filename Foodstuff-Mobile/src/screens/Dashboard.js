import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import Header from "../components/header/Header";
import Navbar from "../components/navbar/Navbar";

import StatCard from "../components/statCard/StatCard";
import WeeklyRevenueChart from "../components/weeklyrevenuechart/WeeklyRevenueChart";
import CategoryChart from "../components/categorychart/CategoryChart";
import BestSellingChart from "../components/bestsellingchart/BestSellingChart";
import RecentOrders from "../components/recentorders/RecentOrders";

import {
  dashboardStats,
  weeklyRevenue,
  categoryData,
  bestSelling,
  recentOrders,
} from "../components/dashboardData/DashboardData";

const COLORS = {
  primary: "#FF6B2C",
  background: "#F5F6F8",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
};

export default function Dashboard({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function carregarUsuario() {
      try {
        const dados = await SecureStore.getItemAsync("user");

        if (dados) {
          setUser(JSON.parse(dados));
        }
      } catch (error) {
        console.log("Erro ao carregar usuário:", error);
      }
    }

    carregarUsuario();
  }, []);

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
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={COLORS.textDark}
            />
          </TouchableOpacity>

        </View>

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
        <WeeklyRevenueChart
          data={weeklyRevenue}
        />

        {/* GRÁFICO DE CATEGORIAS */}
        <CategoryChart
          data={categoryData}
        />

        {/* MAIS VENDIDOS */}
        <BestSellingChart
          data={bestSelling}
        />

        {/* PEDIDOS RECENTES */}
        <RecentOrders
          orders={recentOrders}
        />

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
});