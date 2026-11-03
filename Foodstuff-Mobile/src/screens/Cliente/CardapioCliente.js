import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import sheets from "../../services/api";

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
};

const REFRESH_INTERVAL = 30000;

function formatMoeda(value) {
  return `R$ ${Number(value ?? 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function ProdutoCard({ produto, onPress }) {
  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalhes de ${produto.name}`}
    >
      {produto.image ? (
        <Image
          source={{ uri: produto.image }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="fast-food-outline" size={26} color={C.primary} />
        </View>
      )}

      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {produto.name}
        </Text>

        <Text style={styles.productDescription} numberOfLines={2}>
          {produto.description ?? "Sem descrição"}
        </Text>

        <View style={styles.productBottom}>
          <Text style={styles.productPrice}>{formatMoeda(produto.price)}</Text>

          <View style={styles.addButton}>
            <Ionicons name="add" size={20} color={C.card} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CardapioCliente({ route, navigation }) {
  const params = route?.params ?? {};
  const initialSessionToken =
    params.session_token ?? params.sessionToken ?? null;
  const qrToken = params.qr_token ?? params.token ?? null;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [sessionToken, setSessionToken] = useState(initialSessionToken);
  const [command, setCommand] = useState(null);
  const [nameModalVisible, setNameModalVisible] = useState(
    Boolean(qrToken && !initialSessionToken)
  );
  const [customerName, setCustomerName] = useState("");
  const [openingCommand, setOpeningCommand] = useState(false);

  const requestIdRef = useRef(0);
  const firstFocusRef = useRef(true);

  const carregarCardapio = useCallback(async ({ silent = false } = {}) => {
    const requestId = ++requestIdRef.current;

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const [categoriesResponse, productsResponse] = await Promise.all([
        sheets.getPublicCategories(),
        sheets.getPublicProducts(),
      ]);

      if (requestId !== requestIdRef.current) return;

      setCategories(categoriesResponse.data?.data ?? []);
      setProducts(productsResponse.data?.data ?? []);
      setError(null);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      console.log("Erro ao carregar o cardápio:", err);

      if (!silent) {
        setError("Não foi possível carregar o cardápio.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const carregarComanda = useCallback(async (token) => {
    if (!token) return;

    try {
      const response = await sheets.getPublicCommandBySession(token);
      setCommand(response.data?.data ?? null);
    } catch (err) {
      console.log("Erro ao carregar a comanda:", err);
    }
  }, []);

  const sincronizar = useCallback(
    () =>
      Promise.all([
        carregarCardapio({ silent: true }),
        sessionToken ? carregarComanda(sessionToken) : Promise.resolve(),
      ]),
    [carregarCardapio, carregarComanda, sessionToken]
  );

  const atualizar = useCallback(async () => {
    setRefreshing(true);

    try {
      await sincronizar();
    } finally {
      setRefreshing(false);
    }
  }, [sincronizar]);

  useEffect(() => {
    carregarCardapio();

    return () => {
      requestIdRef.current += 1;
    };
  }, [carregarCardapio]);

  useEffect(() => {
    if (sessionToken) {
      carregarComanda(sessionToken);
    }
  }, [sessionToken, carregarComanda]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        sincronizar();
      }
    });

    return () => subscription.remove();
  }, [sincronizar]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
      } else {
        sincronizar();
      }

      const interval = setInterval(sincronizar, REFRESH_INTERVAL);

      return () => clearInterval(interval);
    }, [sincronizar])
  );

  async function abrirComanda() {
    const name = customerName.trim();

    if (!name) {
      Alert.alert("Atenção", "Informe seu nome para abrir a comanda.");
      return;
    }

    setOpeningCommand(true);

    try {
      const response = await sheets.postCommandByQr(qrToken, {
        customer_name: name,
      });

      const token = response.data?.data?.session_token;

      if (!token) {
        throw new Error("Comanda não identificada.");
      }

      setSessionToken(token);
      setNameModalVisible(false);
    } catch (err) {
      Alert.alert(
        "Erro",
        err.response?.data?.message ??
          err.message ??
          "Não foi possível abrir a comanda."
      );
    } finally {
      setOpeningCommand(false);
    }
  }

  function abrirProduto(produto) {
    navigation.navigate("DetalheProduto", {
      product: produto,
      product_id: produto.product_id,
      sessionToken,
    });
  }

  const categoriasVisiveis = useMemo(() => {
    const idsComProduto = new Set(
      products.map((produto) => produto.category_id)
    );

    return categories.filter((category) =>
      idsComProduto.has(category.category_id)
    );
  }, [categories, products]);

  useEffect(() => {
    if (
      selectedCategory !== null &&
      !categoriasVisiveis.some(
        (category) => category.category_id === selectedCategory
      )
    ) {
      setSelectedCategory(null);
    }
  }, [categoriasVisiveis, selectedCategory]);

  const produtosFiltrados = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((produto) => {
      const matchesCategory =
        !selectedCategory || produto.category_id === selectedCategory;

      const matchesSearch =
        !term ||
        (produto.name ?? "").toLowerCase().includes(term) ||
        (produto.description ?? "").toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  const categoriaSelecionada = categoriasVisiveis.find(
    (category) => category.category_id === selectedCategory
  );

  const comandaAberta = !command || command.status === "OPEN";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      <View style={styles.header}>
        <View style={styles.topBar}>
          <View style={styles.topInfo}>
            <Text style={styles.eyebrow}>
              {command ? `Mesa ${command.table_number}` : "Foodstuff"}
            </Text>
            <Text style={styles.pageTitle}>Cardápio</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={atualizar}
              disabled={refreshing}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Atualizar cardápio"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <Ionicons name="refresh-outline" size={18} color={C.primary} />
              )}
            </TouchableOpacity>

            <View style={styles.customerBadge}>
              <Ionicons name="person-outline" size={14} color={C.primary} />
              <Text style={styles.customerBadgeText} numberOfLines={1}>
                {command?.customer_name?.split(" ")[0] ?? "Cliente"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={17} color={C.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar pratos ou bebidas..."
            placeholderTextColor={C.gray}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={17} color={C.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {[{ category_id: null, name: "Todos" }, ...categoriasVisiveis].map(
            (item) => {
              const active = selectedCategory === item.category_id;

              return (
                <TouchableOpacity
                  key={String(item.category_id)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(item.category_id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>
      </View>

      {!comandaAberta && (
        <View style={styles.closedBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={C.red} />
          <Text style={styles.closedBannerText}>
            Esta comanda não está aberta para novos pedidos.
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.centerText}>Carregando cardápio…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <View style={styles.stateIcon}>
            <Ionicons name="alert-circle-outline" size={28} color={C.red} />
          </View>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => carregarCardapio()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={produtosFiltrados}
          keyExtractor={(item) => String(item.product_id)}
          renderItem={({ item }) => (
            <ProdutoCard produto={item} onPress={() => abrirProduto(item)} />
          )}
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
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {categoriaSelecionada
                  ? categoriaSelecionada.name
                  : "Nossos destaques"}
              </Text>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>
                  {produtosFiltrados.length}
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Ionicons name="restaurant-outline" size={34} color={C.gray} />
              </View>
              <Text style={styles.emptyTitle}>
                {search.trim()
                  ? "Nenhum produto encontrado"
                  : "Cardápio indisponível"}
              </Text>
              <Text style={styles.emptyText}>
                {search.trim()
                  ? "Tente buscar por outro nome ou remova os filtros."
                  : "Nenhum produto disponível no momento. Atualize para conferir novamente."}
              </Text>
              <TouchableOpacity
                style={styles.emptyRefreshButton}
                onPress={atualizar}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={15} color={C.primary} />
                <Text style={styles.emptyRefreshText}>Atualizar</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="restaurant-outline" size={28} color={C.primary} />
            </View>

            <Text style={styles.modalTitle}>Bem-vindo!</Text>
            <Text style={styles.modalSubtitle}>
              Informe seu nome para abrir a comanda da mesa.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Seu nome"
              placeholderTextColor={C.gray}
              value={customerName}
              onChangeText={setCustomerName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={abrirComanda}
            />

            <TouchableOpacity
              style={[styles.modalButton, openingCommand && { opacity: 0.7 }]}
              onPress={abrirComanda}
              disabled={openingCommand}
              activeOpacity={0.85}
            >
              {openingCommand ? (
                <ActivityIndicator color={C.card} size="small" />
              ) : (
                <Text style={styles.modalButtonText}>Abrir comanda</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  header: {
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  topInfo: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.dark,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  customerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 130,
    backgroundColor: C.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  customerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.primary,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 13,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.dark,
    paddingVertical: 0,
  },

  filters: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 15,
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

  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: C.redBg,
  },
  closedBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: C.red,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  sectionCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.primary,
  },

  productCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
    gap: 12,
    shadowColor: "#1F2024",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 11,
    backgroundColor: C.primaryLight,
  },
  productImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 11,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
    minHeight: 80,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.dark,
    lineHeight: 18,
  },
  productDescription: {
    fontSize: 11,
    color: C.gray,
    lineHeight: 15,
    marginTop: 3,
  },
  productBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.redBg,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    fontSize: 13,
    color: C.gray,
    textAlign: "center",
    lineHeight: 19,
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: C.primary,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.card,
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 56,
    paddingHorizontal: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.dark,
  },
  emptyText: {
    fontSize: 12,
    color: C.gray,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.primary,
  },
  emptyRefreshText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.primary,
  },

  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
  },
  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.dark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: C.gray,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  modalInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: C.dark,
    backgroundColor: C.bg,
  },
  modalButton: {
    width: "100%",
    marginTop: 14,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: C.card,
  },
});
