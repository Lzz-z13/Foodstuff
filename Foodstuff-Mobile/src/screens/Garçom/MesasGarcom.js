import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import LogoutButton from "../../components/header/LogoutButton";
import NavbarGarcom from "../../components/navbar/NavbarGarcom";
import NotificacaoMesa from "../../components/notificacaoMesa/NotificacaoMesa";
import useNotificacaoComandas from "../../hooks/useNotificacaoComandas";
import api from "../../services/api";

export default function MesasGarcom({ navigation }) {
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { notificacao, fecharNotificacao } = useNotificacaoComandas(mesas);

  const loadMesas = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.getTables();
      const data = response?.data?.data || [];

      const mesasComStatus = await Promise.all(
        data.map(async (mesa) => {
          try {
            const commandsResponse = await api.getTableCommands(mesa.table_id);
            const commands = commandsResponse?.data?.data || [];
            const temComandaAberta = commands.some(
              (command) => command.status === "OPEN"
            );

            return {
              ...mesa,
              status: temComandaAberta ? "Ocupada" : "Livre",
            };
          } catch (commandError) {
            console.warn(
              `Erro ao buscar comandas da mesa ${mesa.table_id}:`,
              commandError
            );

            return {
              ...mesa,
              status: "Livre",
            };
          }
        })
      );

      setMesas(mesasComStatus);
    } catch (err) {
      console.error("Erro ao buscar mesas:", err);
      setError("Não foi possível carregar as mesas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMesas();

    const intervalId = setInterval(loadMesas, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMesas();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Mesas</Text>
          <Text style={styles.subtitle}>Visualização das mesas disponíveis</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
            activeOpacity={0.8}
          >
            <Text style={styles.refreshText}>
              {refreshing ? "Atualizando..." : "Atualizar"}
            </Text>
          </TouchableOpacity>

          <LogoutButton navigation={navigation} />
        </View>
      </View>

      <NotificacaoMesa
        notificacao={notificacao}
        onClose={fecharNotificacao}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#111827" />
          <Text style={styles.loadingText}>Carregando mesas...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.cardGrid}>
          {mesas.map((mesa) => (
            <TouchableOpacity
              key={mesa.table_id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate("DetalhesMesa", { table: mesa })}
            >
              <Text style={styles.mesaNumero}>Mesa {mesa.number}</Text>
              <Text
                style={[
                  styles.status,
                  mesa.status === "Livre" ? styles.statusLivre : styles.statusOcupada,
                ]}
              >
                {mesa.status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshButton: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  refreshText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "700",
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
  centered: {
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
  errorText: {
    color: "#B91C1C",
    fontSize: 14,
    textAlign: "center",
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
