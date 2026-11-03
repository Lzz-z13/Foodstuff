import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../services/api";

export default function DetalhesMesaGarcom({ route, navigation }) {
  const mesa = route?.params?.table ?? null;
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const carregarDetalhes = async () => {
      if (!mesa?.table_id) {
        setError("Mesa não informada.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.getTableCommands(mesa.table_id);
        const data = response?.data?.data || [];

        setComandas(data);
      } catch (err) {
        console.error("Erro ao buscar detalhes da mesa:", err);
        setError("Não foi possível carregar os detalhes desta mesa.");
      } finally {
        setLoading(false);
      }
    };

    carregarDetalhes();
  }, [mesa?.table_id]);

  if (!mesa) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyText}>Mesa não encontrada.</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = comandas.some((command) => command.status === "OPEN")
    ? "Ocupada"
    : "Livre";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Detalhes da mesa</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Número</Text>
          <Text style={styles.value}>Mesa {mesa.number}</Text>

          <Text style={styles.label}>Status</Text>
          <Text style={[styles.status, status === "Livre" ? styles.statusLivre : styles.statusOcupada]}>
            {status}
          </Text>

          <Text style={styles.label}>ID da mesa</Text>
          <Text style={styles.value}>{mesa.table_id}</Text>
        </View>

        <Text style={styles.subtitle}>Comandas da mesa</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.loadingText}>Carregando comandas...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : comandas.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma comanda registrada nesta mesa.</Text>
          </View>
        ) : (
          comandas.map((command) => (
            <View key={command.command_id} style={styles.commandCard}>
              <Text style={styles.commandTitle}>Comanda #{command.command_id}</Text>
              <Text style={styles.commandMeta}>Cliente: {command.customer_name || "Não informado"}</Text>
              <Text style={styles.commandMeta}>Status: {command.status}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  status: {
    fontSize: 13,
    fontWeight: "800",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  statusLivre: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },
  statusOcupada: {
    backgroundColor: "#FEE2E2",
    color: "#B91C1C",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  commandCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
  },
  commandTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  commandMeta: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 4,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
  },
  emptyText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: "#F8F9FF",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F8F9FF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#374151",
    fontSize: 14,
  },
});
