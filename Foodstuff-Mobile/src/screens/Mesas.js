import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import * as SecureStore from "expo-secure-store";

import Header from "../components/header/Header"; // Ajuste o caminho se necessário
import Navbar from "../components/navbar/Navbar"; // Ajuste o caminho se necessário

// Mesma configuração de acesso usada em src/services/api.js
const api = axios.create({
  baseURL: "http://10.89.240.37:5000/api/foodstuff",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("token");

  if (token) {
    config.headers.Authorization = token;
  }

  return config;
});

const COLORS = {
  primary: "#FF6B2C",
  background: "#F5F6F8",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
  // Cores de status das mesas
  livreBg: "#E6F8F0", livreText: "#2EAE71",
  ocupadaBg: "#E6F5FC", ocupadaText: "#2A9FD8",
  aguardandoBg: "#FFF5E6", aguardandoText: "#F2A900",
  contaBg: "#FCE8E8", contaText: "#E04F4F",
};

// Dados exibidos caso a API não responda (fallback visual)
const MESAS_MOCK = [
  { id: "1", title: "Mesa T-01", status: "LIVRE", statusLabel: "Desocupada", bg: COLORS.livreBg, color: COLORS.livreText },
  { id: "2", title: "Mesa T-02", status: "OCUPADA", statusLabel: "Atendido", bg: COLORS.ocupadaBg, color: COLORS.ocupadaText },
  { id: "3", title: "Mesa T-03", status: "AGUARDANDO", statusLabel: "Atendendo", bg: COLORS.aguardandoBg, color: COLORS.aguardandoText },
  { id: "4", title: "Mesa T-04", status: "OCUPADA", statusLabel: "Atendido", bg: COLORS.ocupadaBg, color: COLORS.ocupadaText },
  { id: "5", title: "Mesa T-05", status: "CONTA", statusLabel: "Pagar", bg: COLORS.contaBg, color: COLORS.contaText },
  { id: "6", title: "Mesa T-06", status: "LIVRE", statusLabel: "Desocupada", bg: COLORS.livreBg, color: COLORS.livreText },
];

// Converte uma mesa vinda da API no formato usado nos cards
function formatarMesa(table) {
  const numero = String(table.number ?? "").padStart(2, "0");

  return {
    id: String(table.table_id),
    title: `Mesa T-${numero}`,
    status: "LIVRE",
    statusLabel: "Desocupada",
    bg: COLORS.livreBg,
    color: COLORS.livreText,
  };
}

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

  const userName = user?.name || "Luiz"; // Usando Luiz como fallback (baseado na imagem)

  const [mesas, setMesas] = useState(MESAS_MOCK);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [numeroMesa, setNumeroMesa] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregarMesas = useCallback(async () => {
    try {
      const response = await api.get("/tables");
      const data = response.data?.data ?? [];

      if (data.length > 0) {
        setMesas(data.map(formatarMesa));
      }
    } catch (error) {
      console.log(
        "Erro ao buscar mesas:",
        error.response?.data?.message || error.message,
      );
    }
  }, []);

  useEffect(() => {
    carregarMesas();
  }, [carregarMesas]);

  function abrirModalCadastro() {
    setNumeroMesa("");
    setModalVisivel(true);
  }

  async function handleCadastrarMesa() {
    const digitos = numeroMesa.replace(/\D/g, "");

    if (!digitos) {
      Alert.alert("Campo obrigatório", "Informe o número da nova mesa (ex: 7).");
      return;
    }

    const number = Number(digitos);

    if (!Number.isInteger(number) || number <= 0) {
      Alert.alert(
        "Número inválido",
        "O número da mesa deve ser um inteiro maior que zero.",
      );
      return;
    }

    setSalvando(true);

    try {
      const response = await api.post("/tables", { number });

      Alert.alert(
        "Sucesso!",
        response.data?.message || "Mesa cadastrada com sucesso.",
      );

      setModalVisivel(false);
      setNumeroMesa("");
      await carregarMesas();
    } catch (error) {
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Não foi possível cadastrar a mesa.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* HEADER PRINCIPAL SE EXISTIR */}
      {/* <Header navigation={navigation} /> */}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* CABEÇALHO DA PÁGINA DE MESAS */}
        <View style={styles.headerSection}>
          <Text style={styles.greetingTitle}>Olá, {userName}!</Text>
          <Text style={styles.greetingSubtitle}>Gerenciamento de Mesas</Text>
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
            <TouchableOpacity key={mesa.id} style={styles.mesaCard} activeOpacity={0.7}>
              <View style={styles.mesaHeader}>
                <Text style={styles.mesaTitle}>{mesa.title}</Text>
                <View style={[styles.badge, { backgroundColor: mesa.bg }]}>
                  <Text style={[styles.badgeText, { color: mesa.color }]}>
                    {mesa.status}
                  </Text>
                </View>
              </View>
              <View style={styles.mesaFooter}>
                <Ionicons name="person-outline" size={14} color={COLORS.textDark} />
                <Text style={styles.mesaStatusLabel}>{mesa.statusLabel}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* BOTÃO CADASTRAR */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={abrirModalCadastro}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Cadastrar uma mesa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL DE CADASTRO DE MESA */}
      <Modal visible={modalVisivel} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => !salvando && setModalVisivel(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Cadastrar uma mesa</Text>
              <Text style={styles.modalSubtitle}>
                Informe o número da nova mesa para salvá-la no sistema.
              </Text>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="grid-outline"
                  size={18}
                  color={COLORS.textGray}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 7"
                  placeholderTextColor={COLORS.textGray}
                  value={numeroMesa}
                  onChangeText={setNumeroMesa}
                  keyboardType="number-pad"
                  autoFocus
                  editable={!salvando}
                  maxLength={4}
                />
              </View>

              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setModalVisivel(false)}
                  disabled={salvando}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleCadastrarMesa}
                  disabled={salvando}
                  activeOpacity={0.8}
                >
                  {salvando ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.modalButtonConfirmText}>Cadastrar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

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
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary, // Linha pontilhada simulada / borda azul na sua imagem original
    borderStyle: 'dashed',
    paddingBottom: 10,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textDark,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: COLORS.textGray,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textGray,
    marginBottom: 12,
    textAlign: 'center',
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
  mesaCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    width: "48%", // Dois cards por linha
    marginBottom: 16,
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
    width: '60%',
    alignItems: "center",
  },
  registerButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBackdrop: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: COLORS.textDark,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textGray,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: "100%",
    color: COLORS.textDark,
    fontSize: 15,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  modalButtonCancelText: {
    color: COLORS.textGray,
    fontWeight: "bold",
    fontSize: 14,
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalButtonConfirmText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});