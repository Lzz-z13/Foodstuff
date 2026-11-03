import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Chave usada para guardar as mesas no aparelho (AsyncStorage)
const MESAS_STORAGE_KEY = "@foodstuff:mesas";

const STATUS_CONFIG = {
  LIVRE: {
    statusLabel: "Desocupada",
    bg: COLORS.livreBg,
    color: COLORS.livreText,
  },
  OCUPADA: {
    statusLabel: "Atendido",
    bg: COLORS.ocupadaBg,
    color: COLORS.ocupadaText,
  },
  AGUARDANDO: {
    statusLabel: "Atendendo",
    bg: COLORS.aguardandoBg,
    color: COLORS.aguardandoText,
  },
  CONTA: {
    statusLabel: "Pagar",
    bg: COLORS.contaBg,
    color: COLORS.contaText,
  },
};

// Dados iniciais exibidos apenas quando não existe nada salvo no aparelho
// e não há conexão com o banco. IDs com prefixo "local-" para não conflitarem
// com os IDs reais do banco e para nunca serem enviados automaticamente.
const MESAS_INICIAIS = [
  { id: "local-1", numero: 1, status: "LIVRE" },
  { id: "local-2", numero: 2, status: "OCUPADA" },
  { id: "local-3", numero: 3, status: "AGUARDANDO" },
  { id: "local-4", numero: 4, status: "OCUPADA" },
  { id: "local-5", numero: 5, status: "CONTA" },
  { id: "local-6", numero: 6, status: "LIVRE" },
];

// Monta uma mesa no formato da tela, independentemente de ela vir do
// banco, do aparelho ou do cadastro feito agora.
function criarMesa({ id, numero, status = "LIVRE", pendente = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.LIVRE;
  const numeroMesa = Number(numero);

  return {
    id: String(id),
    numero: numeroMesa,
    title: `Mesa T-${String(numeroMesa).padStart(2, "0")}`,
    status,
    statusLabel: config.statusLabel,
    bg: config.bg,
    color: config.color,
    pendente: !!pendente,
  };
}

function ordenarMesas(lista) {
  return [...lista].sort((a, b) => a.numero - b.numero);
}

// Mesas criadas no aparelho usam ids "local-*"/"mesa-*" e ainda não existem
// no banco. As demais vêm do banco e podem ser excluídas por lá.
function isMesaLocal(id) {
  const idMesa = String(id);
  return idMesa.startsWith("local-") || idMesa.startsWith("mesa-");
}

function extrairMensagemErro(error) {
  return (
    error?.response?.data?.message ??
    error?.message ??
    "Erro desconhecido."
  );
}

export default function Mesas({ navigation }) {
  const [user, setUser] = useState(null);

  const [mesas, setMesas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mesaDropdownAberta, setMesaDropdownAberta] = useState(null);
  const [deletandoId, setDeletandoId] = useState(null);

  const scrollViewRef = useRef(null);

  // Evita duas sincronizações rodando ao mesmo tempo (foco + primeiro plano).
  const sincronizandoRef = useRef(false);

  // Grava a lista de mesas no aparelho para que elas continuem lá
  // mesmo fechando o app ou ficando sem internet.
  const salvarLocal = useCallback(async (lista) => {
    try {
      await AsyncStorage.setItem(MESAS_STORAGE_KEY, JSON.stringify(lista));
    } catch (error) {
      console.warn("Erro ao salvar mesas localmente:", error);
    }
  }, []);

  const atualizarMesas = useCallback(
    (updater) => {
      setMesas((atual) => {
        const proxima = typeof updater === "function" ? updater(atual) : updater;
        salvarLocal(proxima);
        return proxima;
      });
    },
    [salvarLocal],
  );

  async function lerMesasLocais() {
    try {
      const salvas = await AsyncStorage.getItem(MESAS_STORAGE_KEY);
      if (!salvas) {
        return [];
      }

      const lista = JSON.parse(salvas);

      if (!Array.isArray(lista)) {
        return [];
      }

      return lista
        .filter((mesa) => mesa && Number.isFinite(Number(mesa.numero)))
        .map((mesa) => criarMesa(mesa));
    } catch (error) {
      console.warn("Erro ao carregar mesas locais:", error);
      return [];
    }
  }

  // Busca as mesas do banco e envia as que foram cadastradas no aparelho
  // mas ainda não chegaram na API (feito quando a conexão volta).
  async function sincronizarBanco(mesasLocais) {
    try {
      const response = await api.getTables();
      const doBanco = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

      const mesasBanco = [...doBanco];
      const numerosDoBanco = new Set(
        mesasBanco.map((mesa) => Number(mesa.number)),
      );

      const pendentes = mesasLocais.filter((mesa) => mesa.pendente);

      for (const mesa of pendentes) {
        // O número já existe no banco: a mesa do banco é a dona dele.
        if (numerosDoBanco.has(mesa.numero)) {
          continue;
        }

        try {
          const criada = await api.postTable({ number: mesa.numero });
          const tableId = criada?.data?.data?.table_id;

          if (tableId) {
            mesasBanco.push({ table_id: tableId, number: mesa.numero });
            numerosDoBanco.add(mesa.numero);
          }
        } catch (error) {
          console.warn(
            `Mesa ${mesa.title} ainda não sincronizada:`,
            extrairMensagemErro(error),
          );
        }
      }

      const locaisPorNumero = new Map(
        mesasLocais.map((mesa) => [mesa.numero, mesa]),
      );

      const montadasDoBanco = mesasBanco.map((mesa) => {
        const local = locaisPorNumero.get(Number(mesa.number));

        return criarMesa({
          id: mesa.table_id,
          numero: mesa.number,
          status: local?.status ?? "LIVRE",
          pendente: false,
        });
      });

      // Mantém as mesas que só existem no aparelho (pendentes de envio
      // ou criadas apenas localmente).
      const apenasLocais = mesasLocais.filter(
        (mesa) => !numerosDoBanco.has(mesa.numero),
      );

      atualizarMesas(ordenarMesas([...montadasDoBanco, ...apenasLocais]));
    } catch (error) {
      console.warn("Erro ao sincronizar mesas com o banco:", extrairMensagemErro(error));

      // Sem conexão: mantém o que já existe no aparelho.
      if (mesasLocais.length === 0) {
        atualizarMesas(ordenarMesas(MESAS_INICIAIS.map((mesa) => criarMesa(mesa))));
      }
    }
  }

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

  // Carrega as mesas do aparelho e sincroniza com o banco. Roda ao montar
  // a tela, sempre que ela volta a ficar em foco e quando o app volta ao
  // primeiro plano — assim uma mesa criada sem conexão é enviada assim que
  // a conexão volta, sem precisar reiniciar o app.
  const carregarMesas = useCallback(async () => {
    if (sincronizandoRef.current) {
      return;
    }

    sincronizandoRef.current = true;
    setCarregando(true);

    try {
      const locais = await lerMesasLocais();

      // Mostra o que está salvo no aparelho antes de ir para a API.
      if (locais.length > 0) {
        atualizarMesas(ordenarMesas(locais));
      }

      await sincronizarBanco(locais);
    } finally {
      sincronizandoRef.current = false;
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarMesas();
    }, [carregarMesas]),
  );

  // Reenvia as mesas pendentes quando o app volta ao primeiro plano.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        carregarMesas();
      }
    });

    return () => subscription.remove();
  }, [carregarMesas]);

  const userName = user?.name || "Luiz";
  const userRole = user?.role || "";
  const isManager = userRole === "MANAGER";

  function getProximoNumero(lista) {
    return lista.reduce((maior, mesa) => Math.max(maior, mesa.numero), 0) + 1;
  }

  async function handleCadastrarMesa() {
    if (salvando) {
      return;
    }

    if (!isManager) {
      Alert.alert("Permissão necessária", "Apenas gerentes podem cadastrar mesas.");
      return;
    }

    const proximoNumero = getProximoNumero(mesas);

    // 1) Cadastro local: funciona mesmo sem conexão.
    const novaMesa = criarMesa({
      id: `local-${proximoNumero}`,
      numero: proximoNumero,
      pendente: true,
    });

    setSalvando(true);
    atualizarMesas((mesasAtuais) => ordenarMesas([...mesasAtuais, novaMesa]));

    // 2) Cadastro no banco.
    try {
      const response = await api.postTable({ number: proximoNumero });
      const tableId = response?.data?.data?.table_id;

      if (tableId) {
        atualizarMesas((mesasAtuais) =>
          mesasAtuais.map((mesa) =>
            mesa.id === novaMesa.id
              ? { ...mesa, id: String(tableId), pendente: false }
              : mesa,
          ),
        );
      }
    } catch (error) {
      const mensagem = extrairMensagemErro(error);
      const semConexao = !error?.response;

      if (semConexao) {
        // A mesa continua salva no aparelho e será enviada quando a
        // conexão voltar.
        Alert.alert(
          "Mesa salva localmente",
          `${novaMesa.title} foi salva neste aparelho.\n\n` +
            `Não foi possível gravar no banco agora (${mensagem}). ` +
            "Ela será sincronizada automaticamente quando a conexão voltar.",
        );
      } else {
        // A API respondeu e recusou o cadastro: desfaz o registro local.
        atualizarMesas((mesasAtuais) =>
          mesasAtuais.filter((mesa) => mesa.id !== novaMesa.id),
        );
        Alert.alert("Não foi possível cadastrar a mesa", mensagem);
      }
    } finally {
      setSalvando(false);
    }
  }

  function toggleMesaDropdown(mesaId) {
    setMesaDropdownAberta((atual) => (atual === mesaId ? null : mesaId));
  }

  // Fecha dropdown ao clicar fora (usando ref no ScrollView)
  function fecharDropdown() {
    setMesaDropdownAberta(null);
  }

  function handleDeletarMesa(mesa) {
    if (deletandoId) {
      return;
    }

    if (!isManager) {
      Alert.alert("Permissão necessária", "Apenas gerentes podem excluir mesas.");
      setMesaDropdownAberta(null);
      return;
    }

    setMesaDropdownAberta(null);

    // O React Native não possui window.confirm.
    Alert.alert(
      "Excluir mesa",
      `Deseja realmente excluir a mesa ${mesa.title}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => confirmarExclusao(mesa),
        },
      ],
    );
  }

  async function confirmarExclusao(mesa) {
    setDeletandoId(mesa.id);

    try {
      // Mesas locais não existem no banco, então só saem do aparelho.
      if (!isMesaLocal(mesa.id)) {
        await api.deleteTable(mesa.id);
      }

      atualizarMesas((mesasAtuais) =>
        mesasAtuais.filter((atual) => atual.id !== mesa.id),
      );
    } catch (error) {
      console.warn("Erro ao excluir mesa:", extrairMensagemErro(error));
      Alert.alert("Não foi possível excluir a mesa", extrairMensagemErro(error));
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

        {mesas.length === 0 ? (
          <View style={styles.emptyBox}>
            {carregando ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons
                name="grid-outline"
                size={28}
                color={COLORS.textGray}
              />
            )}
            <Text style={styles.emptyTitle}>
              {carregando
                ? "Carregando mesas..."
                : "Nenhuma mesa cadastrada"}
            </Text>
            {!carregando && (
              <Text style={styles.emptyText}>
                Use o botão abaixo para cadastrar a primeira mesa.
              </Text>
            )}
          </View>
        ) : (
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
                    {mesa.pendente && (
                      <Ionicons
                        name="cloud-offline-outline"
                        size={14}
                        color={COLORS.aguardandoText}
                        style={styles.pendenteIcon}
                      />
                    )}
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
        )}

        {/* BOTÃO CADASTRAR */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.registerButton,
              (salvando || carregando) && styles.registerButtonDisabled,
            ]}
            onPress={handleCadastrarMesa}
            disabled={salvando || carregando}
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
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
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
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textGray,
    textAlign: "center",
  },
  mesasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "stretch",
    gap: 12,
  },
  mesaCardWrapper: {
    position: "relative",
    width: "47%",
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
    // Reserva o espaço do botão "..." para o badge não ficar embaixo dele
    paddingRight: 26,
    marginBottom: 8,
  },
  mesaTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.textDark,
    flexShrink: 1,
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
  pendenteIcon: {
    marginLeft: "auto",
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
