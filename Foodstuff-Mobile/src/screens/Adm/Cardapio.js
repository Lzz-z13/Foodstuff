import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import Header from "../../components/header/Header";
import Navbar from "../../components/navbar/Navbar";
import sheets from "../../services/api";

// ─── Design tokens ─────────────────────────────────────────────────────────
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
  yellow: "#D97706",
  yellowBg: "#FFF5E5",
};

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatMoeda(v) {
  return `R$ ${Number(v ?? 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// ─── Componente de cada produto ─────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete, onToggle }) {
  const disponivel = Boolean(product.is_available);

  return (
    <View style={styles.productCard}>
      {/* Ícone e disponibilidade */}
      <View style={styles.productIconWrap}>
        <Ionicons name="fast-food-outline" size={22} color={C.primary} />
      </View>

      <View style={styles.productInfo}>
        <View style={styles.productTopRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: disponivel ? C.greenBg : C.redBg },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: disponivel ? C.green : C.red },
              ]}
            >
              {disponivel ? "Disponível" : "Indisponível"}
            </Text>
          </View>
        </View>

        <Text style={styles.productCategory} numberOfLines={1}>
          {product.category_name ?? "—"}
        </Text>

        <Text style={styles.productDesc} numberOfLines={2}>
          {product.description ?? "Sem descrição"}
        </Text>

        <View style={styles.productBottom}>
          <Text style={styles.productPrice}>
            {formatMoeda(product.price)}
          </Text>

          <View style={styles.productActions}>
            {/* Toggle disponibilidade */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onToggle(product)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={disponivel ? "eye-outline" : "eye-off-outline"}
                size={17}
                color={C.gray}
              />
            </TouchableOpacity>

            {/* Editar */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onEdit(product)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="create-outline"
                size={17}
                color={C.primary}
              />
            </TouchableOpacity>

            {/* Deletar */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => onDelete(product)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={17} color={C.red} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Modal de Produto (criar / editar) ──────────────────────────────────────
const FORM_EMPTY = {
  name: "",
  description: "",
  price: "",
  cost: "",
  image: "",
  category_id: null,
  requires_preparation: true,
  is_available: true,
};

function ProductModal({ visible, product, categories, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [selectingImage, setSelectingImage] = useState(false);

  useEffect(() => {
    if (visible) {
      if (product) {
        setForm({
          name: product.name ?? "",
          description: product.description ?? "",
          price: String(product.price ?? ""),
          cost: product.cost != null ? String(product.cost) : "",
          image: product.image ?? "",
          category_id: product.category_id ?? null,
          requires_preparation: Boolean(product.requires_preparation),
          is_available: Boolean(product.is_available),
        });
      } else {
        setForm(FORM_EMPTY);
      }
    }
  }, [visible, product]);

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function selecionarImagem() {
    if (saving || selectingImage) return;
    setSelectingImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert("Permissão necessária", "Permita o acesso às fotos para escolher a imagem do produto."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.5, base64: true });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) throw new Error("Não foi possível ler a imagem.");
      const mime = asset.mimeType || (/\.png$/i.test(asset.uri) ? "image/png" : /\.webp$/i.test(asset.uri) ? "image/webp" : /\.gif$/i.test(asset.uri) ? "image/gif" : "image/jpeg");
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)) throw new Error("Escolha uma imagem JPEG, PNG, WEBP ou GIF.");
      if (Math.ceil(asset.base64.length * 3 / 4) > 2 * 1024 * 1024) throw new Error("Escolha uma imagem de até 2 MB.");
      set("image", `data:${mime};base64,${asset.base64}`);
    } catch (error) { Alert.alert("Imagem do produto", error.message || "Não foi possível selecionar a imagem."); }
    finally { setSelectingImage(false); }
  }

  async function salvar() {
    if (saving || selectingImage) return;
    if (!form.name.trim()) {
      Alert.alert("Atenção", "O nome do produto é obrigatório.");
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      Alert.alert("Atenção", "Informe um preço válido.");
      return;
    }
    if (!form.category_id) {
      Alert.alert("Atenção", "Selecione uma categoria.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Number(form.price),
        cost: form.cost !== "" ? Number(form.cost) : null,
        image: form.image.trim() || null,
        category_id: Number(form.category_id),
        requires_preparation: form.requires_preparation,
        is_available: form.is_available,
      };

      if (isEdit) {
        await sheets.updateProduct(product.product_id, payload);
      } else {
        await sheets.createProduct(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      Alert.alert(
        "Erro",
        err.response?.data?.message ??
          `Não foi possível ${isEdit ? "atualizar" : "criar"} o produto.`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalSheet}>
          {/* Cabeçalho */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? "Editar Produto" : "Novo Produto"}
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={C.dark} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Campo label="Nome *" value={form.name} onChangeText={(v) => set("name", v)} placeholder="Ex: Hambúrguer Artesanal" />
            <Campo label="Descrição" value={form.description} onChangeText={(v) => set("description", v)} placeholder="Descreva o produto" multiline />
            <Campo label="Preço (R$) *" value={form.price} onChangeText={(v) => set("price", v)} keyboardType="decimal-pad" placeholder="0,00" />
            <Campo label="Custo (R$)" value={form.cost} onChangeText={(v) => set("cost", v)} keyboardType="decimal-pad" placeholder="0,00 (opcional)" />
            <Text style={styles.fieldLabel}>Imagem do produto</Text>
            <TouchableOpacity disabled={saving || selectingImage} onPress={selecionarImagem} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14, backgroundColor: C.primaryLight, borderRadius: 12, marginBottom: 8 }}>
              <Ionicons name="image-outline" size={22} color={C.primary} />
              <Text style={{ color: C.primary, fontWeight: "700" }}>{selectingImage ? "Carregando..." : form.image ? "Trocar imagem" : "Escolher da galeria"}</Text>
            </TouchableOpacity>
            <Text style={{ color: C.gray, fontSize: 12, marginBottom: 12 }}>JPEG, PNG, WEBP ou GIF. Até 2 MB.</Text>
            {!!form.image && <View style={{ marginBottom: 16 }}>
              <Image source={{ uri: form.image }} style={{ width: "100%", height: 160, borderRadius: 12 }} resizeMode="cover" />
              <TouchableOpacity disabled={saving || selectingImage} onPress={() => set("image", "")} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 }}>
                <Ionicons name="trash-outline" size={18} color={C.red} /><Text style={{ color: C.red, fontWeight: "700" }}>Remover imagem</Text>
              </TouchableOpacity>
            </View>}

            {/* Categoria */}
            <Text style={styles.fieldLabel}>Categoria *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map((cat) => {
                const active = form.category_id === cat.category_id;
                return (
                  <TouchableOpacity
                    key={cat.category_id}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => set("category_id", cat.category_id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.catChipText, active && styles.catChipTextActive]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Switches */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Requer preparo</Text>
              <Switch
                value={form.requires_preparation}
                onValueChange={(v) => set("requires_preparation", v)}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={C.card}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Disponível no cardápio</Text>
              <Switch
                value={form.is_available}
                onValueChange={(v) => set("is_available", v)}
                trackColor={{ false: C.border, true: C.primary }}
                thumbColor={C.card}
              />
            </View>

            {/* Botão salvar */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={salvar}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={C.card} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {isEdit ? "Salvar Alterações" : "Criar Produto"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Campo reutilizável do formulário
function Campo({ label, ...rest }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, rest.multiline && { height: 72, textAlignVertical: "top" }]}
        placeholderTextColor={C.gray}
        {...rest}
      />
    </View>
  );
}

// ─── Tela Principal ──────────────────────────────────────────────────────────
export default function Cardapio({ navigation }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null); // null = Todos
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Carregar categorias
  const carregarCategorias = useCallback(async () => {
    try {
      const res = await sheets.getCategories();
      setCategories(res.data?.data ?? []);
    } catch (err) {
      console.log("Erro ao carregar categorias:");
    }
  }, []);

  // Carregar produtos
  const carregarProdutos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { include_inactive: false };
      if (selectedCat) params.category_id = selectedCat;
      if (search.trim()) params.search = search.trim();

      const res = await sheets.getProducts(params);
      setProducts(res.data?.data ?? []);
    } catch (err) {
      console.log("Erro ao carregar produtos:");
      setError("Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, [selectedCat, search]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  // Abrir modal de criação
  function abrirCriacao() {
    setEditingProduct(null);
    setModalVisible(true);
  }

  // Abrir modal de edição
  function abrirEdicao(product) {
    setEditingProduct(product);
    setModalVisible(true);
  }

  // Confirmar exclusão
  function confirmarExclusao(product) {
    Alert.alert(
      "Excluir Produto",
      `Deseja desativar "${product.name}"? Ele não aparecerá mais no cardápio.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => excluirProduto(product.product_id),
        },
      ]
    );
  }

  async function excluirProduto(product_id) {
    try {
      await sheets.deleteProduct(product_id);
      carregarProdutos();
    } catch (err) {
      Alert.alert(
        "Erro",
        err.response?.data?.message ?? "Não foi possível excluir o produto."
      );
    }
  }

  // Toggle disponibilidade
  async function toggleDisponibilidade(product) {
    const novoValor = !Boolean(product.is_available);
    try {
      await sheets.updateProductAvailability(product.product_id, novoValor);
      carregarProdutos();
    } catch (err) {
      Alert.alert(
        "Erro",
        err.response?.data?.message ??
          "Não foi possível alterar a disponibilidade."
      );
    }
  }

  // Filtragem local por busca (enquanto digita)
  const produtosFiltrados = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      <Header navigation={navigation} />

      {/* Título + Botão Novo */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>Cardápio</Text>
          <Text style={styles.pageSubtitle}>
            {produtosFiltrados.length} produto
            {produtosFiltrados.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={abrirCriacao}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={C.card} />
          <Text style={styles.addBtnText}>Novo</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de busca */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produto..."
          placeholderTextColor={C.gray}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color={C.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro por categoria */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {[{ category_id: null, name: "Todos" }, ...categories].map((cat) => {
          const active = selectedCat === cat.category_id;
          return (
            <TouchableOpacity
              key={String(cat.category_id)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setSelectedCat(cat.category_id)}
              activeOpacity={0.7}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Lista de produtos */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.centerText}>Carregando produtos…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={28} color={C.red} />
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={carregarProdutos}
            activeOpacity={0.8}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : produtosFiltrados.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="restaurant-outline" size={40} color={C.border} />
          <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
          <TouchableOpacity
            style={styles.addBtnOutline}
            onPress={abrirCriacao}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnOutlineText}>Adicionar produto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={produtosFiltrados}
          keyExtractor={(item) => String(item.product_id)}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onEdit={abrirEdicao}
              onDelete={confirmarExclusao}
              onToggle={toggleDisponibilidade}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal criar / editar */}
      <ProductModal
        visible={modalVisible}
        product={editingProduct}
        categories={categories}
        onClose={() => setModalVisible(false)}
        onSaved={carregarProdutos}
      />

      <Navbar navigation={navigation} activeTab="Cardápio" />
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Topo
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.dark,
  },
  pageSubtitle: {
    fontSize: 12,
    color: C.gray,
    marginTop: 1,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.card,
  },

  // Busca
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: C.dark,
  },

  // Filtros
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 2,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    alignItems: "center",
  },
  filterChip: {
    flexShrink: 0,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 14,
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
    flexShrink: 0,
    fontSize: 12,
    color: C.gray,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: C.card,
  },

  // Lista
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 10,
  },

  // Card produto
  productCard: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 12,
  },
  productIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: C.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  productInfo: {
    flex: 1,
  },
  productTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: C.dark,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  productCategory: {
    fontSize: 10,
    color: C.primary,
    fontWeight: "600",
    marginTop: 1,
  },
  productDesc: {
    fontSize: 11,
    color: C.gray,
    marginTop: 3,
    lineHeight: 15,
  },
  productBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: C.dark,
  },
  productActions: {
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Estados vazios / loading
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 60,
  },
  centerText: {
    fontSize: 13,
    color: C.gray,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: C.gray,
    textAlign: "center",
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: C.primary,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.card,
  },
  addBtnOutline: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  addBtnOutlineText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.primary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
  },

  // Form
  fieldWrap: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.gray,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: C.dark,
    backgroundColor: C.bg,
  },
  categoryScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: 12,
  },
  catChip: {
    flexShrink: 0,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  catChipText: {
    flexShrink: 0,
    fontSize: 12,
    color: C.gray,
    fontWeight: "600",
  },
  catChipTextActive: {
    color: C.card,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 4,
  },
  switchLabel: {
    fontSize: 13,
    color: C.dark,
    fontWeight: "600",
  },
  saveBtn: {
    marginTop: 20,
    marginBottom: 12,
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: C.card,
  },
});
