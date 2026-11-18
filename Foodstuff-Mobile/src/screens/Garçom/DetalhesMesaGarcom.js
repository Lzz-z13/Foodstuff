import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  AppState,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../services/api";

const STATUS_COMANDA = {
  OPEN: "Aberta",
  CLOSED: "Aguardando pagamento",
  PAID: "Paga",
  CANCELLED: "Cancelada",
};

const hora = (data) => {
  if (!data) return "—";

  const momento = new Date(data);

  if (Number.isNaN(momento.getTime())) return "—";

  return `${String(momento.getHours()).padStart(2, "0")}:${String(
    momento.getMinutes(),
  ).padStart(2, "0")}`;
};

export default function DetalhesMesaGarcom({ route, navigation }) {
  const mesa = route?.params?.table ?? null;
  const [comandas, setComandas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closingId, setClosingId] = useState(null);
  const closingRef = useRef(false);
  const loadingRef = useRef(false);

  const carregarDetalhes = useCallback(
    async (silencioso = false) => {
      if (loadingRef.current || closingRef.current) return;
      if (!mesa?.table_id) {
        setError("Mesa não informada.");
        setLoading(false);
        return;
      }

      loadingRef.current = true;
      try {
        if (!silencioso) setLoading(true);
        setError("");

        const response = await api.getTableCommands(mesa.table_id);
        const data = response?.data?.data || [];

        if (!closingRef.current) setComandas(data);
      } catch (err) {
        console.error("Erro ao buscar detalhes da mesa:");
        setError("Não foi possível carregar os detalhes desta mesa.");
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [mesa?.table_id],
  );

  // Recarrega ao voltar de "Anotar pedido" para refletir a comanda aberta.
  useFocusEffect(
    useCallback(() => {
      carregarDetalhes();
      const timer = setInterval(() => {
        if (AppState.currentState === "active") carregarDetalhes(true);
      }, 10000);
      return () => clearInterval(timer);
    }, [carregarDetalhes]),
  );

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

  const status =
    loading || error
      ? "Sem confirmação"
      : comandas.some((c) => ["OPEN", "CLOSED"].includes(c.status))
        ? "Ocupada"
        : "Livre";

  function anotarPedidoNaMesa() {
    navigation.navigate("AnotarPedido", { mesa, novaComanda: true });
  }

  function solicitarConta(command) {
    Alert.alert(
      "Fechar comanda?",
      `Encerrar a comanda de ${command.customer_name}? Os pedidos já enviados continuam no preparo. O pagamento é feito no caixa.`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Fechar comanda",
          onPress: async () => {
            if (closingRef.current) return;
            closingRef.current = true;
            setClosingId(command.command_id);
            try {
              const response = await api.closeCommand(command.command_id);
              const status = response.data.data.status;
              setComandas((current) =>
                current.map((c) =>
                  c.command_id === command.command_id ? { ...c, status } : c,
                ),
              );
              Alert.alert(
                "Comanda encerrada",
                status === "CLOSED"
                  ? "Conta solicitada. A comanda está aguardando pagamento no caixa."
                  : "Comanda encerrada sem novos pedidos.",
              );
            } catch (error) {
              Alert.alert(
                "Não foi possível fechar",
                error.response?.data?.message || error.message || "Não foi possível fechar a comanda.",
              );
            } finally {
              closingRef.current = false;
              setClosingId(null);
            }
          },
        },
      ],
    );
  }

  function anotarPedidoNaComanda(command) {
    navigation.navigate("AnotarPedido", {
      commandId: command.command_id,
      mesa,
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Detalhes da mesa</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Número</Text>
          <Text style={styles.value}>Mesa {mesa.number}</Text>

          <Text style={styles.label}>Status</Text>
          <Text
            style={[
              styles.status,
              status === "Livre" ? styles.statusLivre : styles.statusOcupada,
            ]}
          >
            {status}
          </Text>
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
            <Text style={styles.emptyText}>
              Nenhuma comanda registrada nesta mesa.
            </Text>
          </View>
        ) : (
          comandas.map((command) => (
            <View key={command.command_id} style={styles.commandCard}>
              <Text style={styles.commandTitle}>
                Comanda #{command.command_id}
              </Text>
              <Text style={styles.commandMeta}>
                Cliente: {command.customer_name || "Não informado"}
              </Text>
              <Text style={styles.commandMeta}>
                Aberta às: {hora(command.opened_at)}
              </Text>
              <Text
                style={[
                  styles.commandStatus,
                  command.status === "OPEN"
                    ? styles.commandStatusAberta
                    : styles.commandStatusEncerrada,
                ]}
              >
                {STATUS_COMANDA[command.status] ?? command.status}
              </Text>

              <TouchableOpacity
                style={styles.viewCommandButton}
                onPress={() =>
                  navigation.navigate("DetalhesPedido", {
                    commandId: command.command_id,
                  })
                }
              >
                <Ionicons name="receipt-outline" size={17} color="#FF6B2C" />
                <Text style={styles.viewCommandText}>
                  Ver comanda e pedidos
                </Text>
              </TouchableOpacity>
              {command.status === "OPEN" && (
                <TouchableOpacity
                  style={styles.anotarComandaButton}
                  disabled={!!closingId}
                  onPress={() => anotarPedidoNaComanda(command)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.anotarComandaButtonText}>
                    Adicionar pedido
                  </Text>
                </TouchableOpacity>
              )}
              {command.status === "OPEN" && (
                <TouchableOpacity
                  disabled={!!closingId}
                  style={[
                    styles.closeCommandButton,
                    !!closingId && { opacity: 0.5 },
                  ]}
                  onPress={() => solicitarConta(command)}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={17}
                    color="#166534"
                  />
                  <Text style={styles.closeCommandText}>
                    {closingId === command.command_id
                      ? "Fechando..."
                      : "Fechar comanda / solicitar conta"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#111827" />
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryButton}
          disabled={loading || !!error || !!closingId}
          onPress={anotarPedidoNaMesa}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Nova comanda</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  viewCommandButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  viewCommandText: { fontSize: 13, fontWeight: "700", color: "#FF6B2C" },
  closeCommandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#EAF8EF",
    marginTop: 10,
  },
  closeCommandText: { fontSize: 12, fontWeight: "700", color: "#166534" },
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
  commandStatus: {
    fontSize: 12,
    fontWeight: "800",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 6,
  },
  commandStatusAberta: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
  },
  commandStatusEncerrada: {
    backgroundColor: "#E5E7EB",
    color: "#4B5563",
  },
  anotarComandaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EA5B25",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  anotarComandaButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
    backgroundColor: "#F8F9FF",
  },
  primaryButton: {
    flex: 1,
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
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  secondaryButtonText: {
    color: "#111827",
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
