import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import Header from "../components/header/Header"; // Ajuste o caminho se necessário
import Navbar from "../components/navbar/Navbar"; // Ajuste o caminho se necessário
import api from "../services/api";

const COLORS = {
  primary: "#FF6B2C",
  background: "#F5F6F8",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
  // Cores de status das mesas
  livreBg: "#E6F8F0",
  livreText: "#2EAE71",
  ocupadaBg: "#E6F5FC",
  ocupadaText: "#2A9FD8",
  aguardandoBg: "#FFF5E6",
  aguardandoText: "#F2A900",
  contaBg: "#FCE8E8",
  contaText: "#E04F4F",
};

// Dados mockados baseados na imagem do seu TCC
// IDs com prefixo "local-" para não conflitar com IDs reais do banco
const MESAS_INICIAIS = [
  {
    id: "local-1",
    numero: 1,
    title: "Mesa T-01",
    status: "LIVRE",
    statusLabel: "Desocupada",
    bg: COLORS.livreBg,
    color: COLORS.livreText,
  },
  {
    id: "local-2",
    numero: 2,
    title: "Mesa T-02",
    status: "OCUPADA",
    statusLabel: "Atendido",
    bg: COLORS.ocupadaBg,
    color: COLORS.ocupadaText,
  },
  {
    id: "local-3",
    numero: 3,
    title: "Mesa T-03",
    status: "AGUARDANDO",
    statusLabel: "Atendendo",
    bg: COLORS.aguardandoBg,
    color: COLORS.aguardandoText,
  },
  {
    id: "local-4",
    numero: 4,
    title: "Mesa T-04",
    status: "OCUPADA",
    statusLabel: "Atendido",
    bg: COLORS.ocupadaBg,
    color: COLORS.ocupadaText,
  },
  {
    id: "local-5",
    numero: 5,
    title: "Mesa T-05",
    status: "CONTA",
    statusLabel: "Pagar",
    bg: COLORS.contaBg,
    color: COLORS.contaText,
  },
  {
    id: "local-6",
    numero: 6,
    title: "Mesa T-06",
    status: "LIVRE",
    statusLabel: "Desocupada",
    bg: COLORS.livreBg,
    color: COLORS.livreText,
  },
];

export default function Mesas({ navigation }) {
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

  const userName = user?.name || "Luiz";
  const userRole = user?.role || "";
  const isManager = userRole === "MANAGER";

  const [mesas, setMesas] = useState(MESAS_INICIAIS);
  const [salvando, setSalvando] = useState(false);
  const [mesaDropdownAberta, setMesaDropdownAberta] = useState(null);
  const [deletandoId, setDeletandoId] = useState(null);

  function getProximoNumero() {
    return mesas.reduce((maior, mesa) => Math.max(maior, mesa.numero), 0) + 1;
  }

  async function handleCadastrarMesa() {
    if (salvando) {
      return;
    }

    if (!isManager) {
      alert("Apenas gerentes podem cadastrar mesas.");
      return;
    }

    const proximoNumero = getProximoNumero();

    const novaMesa = {
      id: `mesa-${proximoNumero}`,
      numero: proximoNumero,
      title: `Mesa T-${String(proximoNumero).padStart(2, "0")}`,
      status: "LIVRE",
      statusLabel: "Desocupada",
      bg: COLORS.livreBg,
      color: COLORS.livreText,
    };

    setSalvando(true);
    setMesas((mesasAtuais) => [...mesasAtuais, novaMesa]);

    try {
      const response = await api.postTable({ number: proximoNumero });
      const tableId = response?.data?.data?.table_id;
      
      // Se a API retornou um ID real, atualiza a mesa local com o ID real
      if (tableId) {
        setMesas((mesasAtuais) =>
          mesasAtuais.map((m) =>
            m.id === novaMesa.id ? { ...m, id: String(tableId) } : m,
          ),
        );
      }
    } catch (error) {
      const msg = error?.response?.data?.message ?? error?.message;
      console.warn("Erro ao criar mesa na API:", msg);
      // Se a API falhou, remove a mesa que foi adicionada otimisticamente
      setMesas((mesasAtuais) =>
        mesasAtuais.filter((m) => m.id !== novaMesa.id),
      );
      alert(`Erro ao cadastrar mesa: ${msg}`);
    } finally {
      setSalvando(false);
    }
  }

  function toggleMesaDropdown(mesaId) {
    setMesaDropdownAberta((atual) => (atual === mesaId ? null : mesaId));
  }

  // Fecha dropdown ao clicar fora (usando ref no ScrollView)
  const scrollViewRef = useRef(null);

  function fecharDropdown() {
    setMesaDropdownAberta(null);
  }

  async function handleDeletarMesa(mesa) {
    if (deletandoId) {
      return;
    }

    if (!isManager) {
      alert("Apenas gerentes podem excluir mesas.");
      setMesaDropdownAberta(null);
      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente excluir a mesa ${mesa.title}?`,
    );

    if (!confirmar) {
      setMesaDropdownAberta(null);
      return;
    }

    setDeletandoId(mesa.id);
    setMesaDropdownAberta(null);

    try {
      // Mesas locais têm id começando com "local-" ou "mesa-"
      const isLocal =
        typeof mesa.id === "string" &&
        (mesa.id.startsWith("local-") || mesa.id.startsWith("mesa-"));

      if (!isLocal) {
        // Mesa vem da API, tenta deletar na API
        await api.deleteTable(mesa.id);
      }

      // Remove localmente em ambos os casos
      setMesas((mesasAtuais) =>
        mesasAtuais.filter((m) => m.id !== mesa.id),
      );
    } catch (error) {
      const msg = error?.response?.data?.message ?? error?.message;
      console.warn("Erro ao excluir mesa:", msg);
      alert(`Erro ao excluir a mesa: ${msg}`);
    } finally {
      setDeletandoId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.card}
      />

      {/* HEADER - igual ao Dashboard */}
      <Header navigation={navigation} />

      <ScrollView
        ref={scrollViewRef}
        onScroll={fecharDropdown}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SAUDAÇÃO - igual ao Dashboard */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greetingTitle}>
              Bom dia, {userName}
            </Text>
            <Text style={styles.greetingSubtitle}>
              Gerenciamento de Mesas
            </Text>
          </View>
        </View>

        {/* SESSÃO DE DESEMPENHO */}
        <Text style={styles.sectionTitle}>DESEMPENHO</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mesas.length}</Text>
            <Text style={styles.statLabel}>Ativos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Atendidas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>14m</Text>
            <Text style={styles.statLabel}>T. Médio</Text>
          </View>
        </View>

        {/* SESSÃO DE MESAS */}
        <Text style={styles.sectionTitle}>MINHAS MESAS DESIGNADAS</Text>
        <View style={styles.mesasGrid}>
          {mesas.map((mesa) => (
            <View key={mesa.id} style={styles.mesaCardWrapper}>
              <TouchableOpacity
                style={styles.mesaCard}
                activeOpacity={0.7}
              >
                <View style={styles.mesaHeader}>
                  <Text style={styles.mesaTitle}>{mesa.title}</Text>
                  <View style={[styles.badge, { backgroundColor: mesa.bg }]}>
                    <Text style={[styles.badgeText, { color: mesa.color }]}>
                      {mesa.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.mesaFooter}>
                  <Ionicons
                    name="person-outline"
                    size={14}
                    color={COLORS.textDark}
                  />
                  <Text style={styles.mesaStatusLabel}>
                    {mesa.statusLabel}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Dropdown button */}
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => toggleMesaDropdown(mesa.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={COLORS.textGray}
                />
              </TouchableOpacity>

              {/* Dropdown menu - rendered inside wrapper but positioned absolutely */}
              {mesaDropdownAberta === mesa.id && (
                <View style={styles.dropdown} pointerEvents="box-none">
                  <TouchableWithoutFeedback
                    onPress={fecharDropdown}
                    accessibilityElementsHidden={true}
                    importantForAccessibility="no-hide-descendants"
                  >
                    <View style={styles.dropdownOverlay} />
                  </TouchableWithoutFeedback>
                  <View style={styles.dropdownContent}>
                    <TouchableOpacity
                      style={[
                        styles.dropdownItem,
                        deletandoId === mesa.id && styles.dropdownItemDisabled,
                      ]}
                      onPress={() => handleDeletarMesa(mesa)}
                      disabled={!!deletandoId}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#EF4444"
                      />
                      <Text style={styles.dropdownItemText}>Excluir mesa</Text>
                      {deletandoId === mesa.id && (
                        <Ionicons
                          name="refresh"
                          size={16}
                          color="#EF4444"
                          style={styles.spinner}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* BOTÃO CADASTRAR */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.registerButton,
              salvando && styles.registerButtonDisabled,
            ]}
            onPress={handleCadastrarMesa}
            disabled={salvando}
            activeOpacity={0.7}
          >
            <Text style={styles.registerButtonText}>
              {salvando ? "Cadastrando..." : "Cadastrar uma mesa"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FOOTER NAVBAR (Aba 'Mesas' como ativa) */}
      <Navbar navigation={navigation} activeTab="Mesas" />
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
    paddingBottom: 40,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textGray,
    marginBottom: 12,
    marginTop: 8,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    width: "31%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textDark,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    marginTop: 4,
  },
  mesasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  mesaCardWrapper: {
    position: "relative",
    width: "48%",
    marginBottom: 16,
  },
  mesaCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mesaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mesaTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.textDark,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  mesaFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  mesaStatusLabel: {
    fontSize: 12,
    color: COLORS.textGray,
    marginLeft: 4,
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: "60%",
    alignItems: "center",
  },
  registerButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  dropdownButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
  dropdown: {
    position: "absolute",
    top: 36,
    right: 0,
    left: 0,
    zIndex: 1000,
  },
  dropdownOverlay: {
    position: "absolute",
    top: -9999,
    left: -9999,
    right: -9999,
    bottom: -9999,
    backgroundColor: "transparent",
  },
  dropdownContent: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    minWidth: 160,
    zIndex: 1001,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  dropdownItemDisabled: {
    opacity: 0.6,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  spinner: {
    marginLeft: "auto",
  },
});
