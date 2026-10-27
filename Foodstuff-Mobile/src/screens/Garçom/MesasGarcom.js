import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import LogoutButton from "../../components/header/LogoutButton";
import NavbarGarcom from "../../components/navbar/NavbarGarcom";

export default function MesasGarcom({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mesas</Text>
          <Text style={styles.subtitle}>Visualização das mesas disponíveis</Text>
        </View>
        <LogoutButton navigation={navigation} />
      </View>

      <View style={styles.cardGrid}>
        {[
          { numero: 1, status: "Livre" },
          { numero: 2, status: "Ocupada" },
          { numero: 3, status: "Livre" },
          { numero: 4, status: "Ocupada" },
        ].map((mesa) => (
          <TouchableOpacity key={mesa.numero} style={styles.card} activeOpacity={0.8}>
            <Text style={styles.mesaNumero}>Mesa {mesa.numero}</Text>
            <Text style={[styles.status, mesa.status === "Livre" ? styles.statusLivre : styles.statusOcupada]}>
              {mesa.status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <NavbarGarcom navigation={navigation} activeTab="Mesas" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 4,
    color: "#6B7280",
    fontSize: 14,
  },
  cardGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 16,
  },
  card: {
    width: "46%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 2,
  },
  mesaNumero: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  status: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusLivre: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },
  statusOcupada: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
  },
});
