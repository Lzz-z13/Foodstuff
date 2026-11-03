import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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

export default function DetalheProduto({ route, navigation }) {
  const params = route?.params ?? {};
  const sessionToken = params.session_token ?? params.sessionToken ?? null;
  const productId =
    params.product_id ?? params.productId ?? params.product?.product_id ?? null;

  const initialProductRef = useRef(params.product ?? null);
  const firstFocusRef = useRef(true);

  const [product, setProduct] = useState(params.product ?? null);
  const [loading, setLoading] = useState(!params.product);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const carregarProduto = useCallback(
    async ({ silent = false } = {}) => {
      if (!productId) {
        setLoading(false);
        setError("Produto não encontrado.");
        return;
      }

      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await sheets.getPublicProductById(productId);

        setProduct(response.data?.data ?? null);
        setError(null);
      } catch (err) {
        console.log("Erro ao carregar o produto:", err);

        if (err.response?.status === 404) {
          setProduct(null);
          setError("Este produto não está mais disponível no cardápio.");
        } else if (!silent) {
          setError("Não foi possível carregar o produto.");
        }
      } finally {
        setLoading(false);
      }
    },
    [productId]
  );

  const atualizarProduto = useCallback(async () => {
    setRefreshing(true);

    try {
      await carregarProduto({ silent: true });
    } finally {
      setRefreshing(false);
    }
  }, [carregarProduto]);

  useEffect(() => {
    carregarProduto({ silent: Boolean(initialProductRef.current) });
  }, [carregarProduto]);

  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
      } else {
        carregarProduto({ silent: true });
      }

      const interval = setInterval(
        () => carregarProduto({ silent: true }),
        REFRESH_INTERVAL
      );

      return () => clearInterval(interval);
    }, [carregarProduto])
  );

  function alterarQuantidade(delta) {
    setQuantity((current) => Math.min(99, Math.max(1, current + delta)));
  }

  async function adicionarPedido() {
    if (!product) return;

    if (!sessionToken) {
      Alert.alert(
        "Comanda não identificada",
        "Escaneie o QR Code da mesa para abrir sua comanda."
      );
      return;
    }

    const observacao = observation.trim();

    setSubmitting(true);

    try {
      await sheets.postPublicOrder(sessionToken, {
        items: [
          {
            product_id: product.product_id,
            quantity,
            ...(observacao ? { observation: observacao } : {}),
          },
        ],
      });

      Alert.alert(
        "Pedido enviado",
        `${quantity}x ${product.name} foi adicionado à sua comanda.`,
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      const status = err.response?.status;

      if (status === 400 || status === 404) {
        atualizarProduto();
      }

      Alert.alert(
        "Erro",
        err.response?.data?.message ??
          "Não foi possível adicionar o item à comanda."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const total = Number(product?.price ?? 0) * quantity;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={21} color={C.dark} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Detalhes do produto</Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={atualizarProduto}
          disabled={refreshing || loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Atualizar produto"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={19} color={C.primary} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.centerText}>Carregando produto…</Text>
        </View>
      ) : error || !product ? (
        <View style={styles.centerBox}>
          <View style={styles.stateIcon}>
            <Ionicons name="alert-circle-outline" size={28} color={C.red} />
          </View>
          <Text style={styles.centerText}>
            {error ?? "Produto não encontrado."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Voltar ao cardápio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={atualizarProduto}
                colors={[C.primary]}
                tintColor={C.primary}
              />
            }
          >
            {product.image ? (
              <Image
                source={{ uri: product.image }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons
                  name="fast-food-outline"
                  size={64}
                  color={C.primary}
                />
              </View>
            )}

            <View style={styles.content}>
              <View style={styles.badgeRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {product.category_name ?? "Cardápio"}
                  </Text>
                </View>

                {Boolean(product.requires_preparation) && (
                  <View style={styles.prepBadge}>
                    <Ionicons name="flame-outline" size={12} color={C.green} />
                    <Text style={styles.prepBadgeText}>Feito na hora</Text>
                  </View>
                )}
              </View>

              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>
                {formatMoeda(product.price)}
              </Text>

              <Text style={styles.description}>
                {product.description ?? "Sem descrição"}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Quantidade</Text>

              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    quantity === 1 && styles.quantityButtonDisabled,
                  ]}
                  onPress={() => alterarQuantidade(-1)}
                  disabled={quantity === 1}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="remove"
                    size={20}
                    color={quantity === 1 ? C.gray : C.dark}
                  />
                </TouchableOpacity>

                <Text style={styles.quantityValue}>{quantity}</Text>

                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => alterarQuantidade(1)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={C.dark} />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Alguma observação?</Text>
              <Text style={styles.sectionHint}>
                Ex.: sem cebola, ponto da carne, molho à parte…
              </Text>

              <TextInput
                style={styles.observationInput}
                placeholder="Digite aqui (opcional)"
                placeholderTextColor={C.gray}
                value={observation}
                onChangeText={setObservation}
                multiline
                maxLength={255}
                textAlignVertical="top"
              />

              <Text style={styles.counterText}>{observation.length}/255</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoeda(total)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.addButton, submitting && { opacity: 0.7 }]}
              onPress={adicionarPedido}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={C.card} size="small" />
              ) : (
                <>
                  <Ionicons name="bag-add-outline" size={18} color={C.card} />
                  <Text style={styles.addButtonText}>Adicionar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: C.dark,
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

  scrollContent: {
    paddingBottom: 24,
  },
  heroImage: {
    width: "100%",
    height: 230,
    backgroundColor: C.primaryLight,
  },
  heroPlaceholder: {
    width: "100%",
    height: 230,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    marginTop: -18,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#1F2024",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: C.primaryLight,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  prepBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: C.greenBg,
  },
  prepBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.green,
  },

  productName: {
    fontSize: 22,
    fontWeight: "800",
    color: C.dark,
    lineHeight: 28,
  },
  productPrice: {
    fontSize: 19,
    fontWeight: "800",
    color: C.primary,
    marginTop: 4,
  },
  description: {
    fontSize: 13,
    color: C.gray,
    lineHeight: 20,
    marginTop: 10,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 18,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },
  sectionHint: {
    fontSize: 11,
    color: C.gray,
    marginTop: 3,
  },

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 12,
  },
  quantityButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    opacity: 0.6,
  },
  quantityValue: {
    minWidth: 32,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },

  observationInput: {
    marginTop: 10,
    minHeight: 80,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: C.dark,
    backgroundColor: C.bg,
  },
  counterText: {
    alignSelf: "flex-end",
    fontSize: 10,
    color: C.gray,
    marginTop: 5,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  totalBox: {
    flexShrink: 0,
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: 19,
    fontWeight: "800",
    color: C.dark,
    marginTop: 1,
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    maxWidth: 210,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: C.card,
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 30,
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
});
