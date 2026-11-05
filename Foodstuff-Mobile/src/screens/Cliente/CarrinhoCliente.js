import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCustomer } from "../../contexts/CustomerContext";

const money = (value) => `R$ ${Number(value).toFixed(2).replace(".", ",")}`;

export default function CarrinhoCliente({ navigation }) {
  const customer = useCustomer();
  const { cart, table, command, submitting, pending, canOrder } = customer;
  const [name, setName] = useState("");
  const total =
    cart.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
      0,
    ) / 100;

  async function send() {
    try {
      const result = await customer.checkout(name);
      if (!result) return;
      Alert.alert(
        "Pedido enviado",
        `Pedido #${result.orderId} enviado para a cozinha.${result.storageWarning ? " Não foi possível atualizar a confirmação no aparelho. Se aparecer uma pendência ao reabrir, informe esse número ao garçom." : ""}`,
        [{ text: "Voltar ao cardápio", onPress: () => navigation.popToTop() }],
      );
    } catch (error) {
      Alert.alert(
        "Pedido não confirmado",
        error.response?.data?.message ||
          error.message ||
          "Verifique sua conexão.",
      );
    }
  }

  function confirm() {
    if (!command && !name.trim()) {
      Alert.alert(
        "Nome da comanda",
        "Informe seu nome ou o nome de referência do grupo.",
      );
      return;
    }
    Alert.alert(
      "Confirmar pedido?",
      `Mesa ${table.number}\n${command?.customer_name || name.trim()}\nProdutos: ${money(total)}`,
      [
        { text: "Revisar", style: "cancel" },
        { text: "Enviar para a cozinha", onPress: send },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Voltar ao cardápio"
        >
          <Ionicons name="arrow-back" size={24} color="#1F2024" />
        </TouchableOpacity>
        <Text style={styles.title}>Meu carrinho</Text>
        <Text style={styles.subtitle}>Mesa {table?.number}</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {pending && (
            <Text style={styles.warning}>
              O último envio está sem confirmação. Volte ao cardápio e confira
              com o garçom antes de fazer outro pedido.
            </Text>
          )}
          {command && command.status !== "OPEN" && (
            <Text style={styles.warning}>
              Esta comanda não aceita novos pedidos. Volte ao cardápio para
              iniciar outro atendimento.
            </Text>
          )}
          {!cart.length && (
            <View style={styles.empty}>
              <Ionicons name="bag-outline" size={46} color="#FF6B2C" />
              <Text style={styles.title}>Seu carrinho está vazio</Text>
              <Text style={styles.subtitle}>
                Escolha os produtos no cardápio.
              </Text>
            </View>
          )}
          {cart.map((item) => (
            <View style={styles.card} key={item.key}>
              <Text style={styles.name}>{item.name}</Text>
              {!!item.observation && (
                <Text style={styles.subtitle}>{item.observation}</Text>
              )}
              <Text style={styles.subtitle}>
                {money(item.price)} por unidade
              </Text>
              <View style={styles.row}>
                <View style={styles.quantity}>
                  <TouchableOpacity
                    style={styles.step}
                    disabled={submitting}
                    onPress={() => customer.changeQuantity(item.key, -1)}
                    accessibilityLabel={`Diminuir ${item.name}`}
                  >
                    <Ionicons name="remove" size={20} color="#FF6B2C" />
                  </TouchableOpacity>
                  <Text style={styles.name}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.step}
                    disabled={submitting || item.quantity >= 99}
                    onPress={() => customer.changeQuantity(item.key, 1)}
                    accessibilityLabel={`Aumentar ${item.name}`}
                  >
                    <Ionicons name="add" size={20} color="#FF6B2C" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.name}>
                  {money(item.price * item.quantity)}
                </Text>
                <TouchableOpacity
                  disabled={submitting}
                  onPress={() => customer.removeItem(item.key)}
                  accessibilityLabel={`Remover ${item.name}`}
                >
                  <Ionicons name="trash-outline" size={21} color="#C24136" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {!!cart.length && (
            <View style={styles.card}>
              <Text style={styles.name}>
                {command ? `Comanda #${command.command_id}` : "Nome da comanda"}
              </Text>
              {command ? (
                <Text style={styles.subtitle}>{command.customer_name}</Text>
              ) : (
                <>
                  <Text style={styles.subtitle}>
                    Pode ser seu nome ou o nome de referência do grupo. Uma
                    pessoa faz os pedidos por esta comanda.
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex.: Ana — família"
                    maxLength={100}
                    editable={!submitting}
                    autoCapitalize="words"
                    accessibilityLabel="Nome da comanda"
                  />
                </>
              )}
              <Text style={styles.subtitle}>
                Os produtos serão enviados juntos. A comanda só será aberta ao
                confirmar o primeiro pedido.
              </Text>
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <View style={styles.row}>
            <Text style={styles.name}>Subtotal dos produtos</Text>
            <Text style={styles.title}>{money(total)}</Text>
          </View>
          <Text style={styles.subtitle}>
            Taxa de serviço, quando aplicável, é apresentada no fechamento da
            comanda.
          </Text>
          <TouchableOpacity
            style={[
              styles.button,
              (!cart.length || !canOrder || submitting) && styles.disabled,
            ]}
            disabled={!cart.length || !canOrder || submitting}
            onPress={confirm}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Confirmar pedido</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" },
  flex: { flex: 1 },
  header: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFF",
  },
  title: { fontSize: 19, fontWeight: "700", color: "#1F2024" },
  subtitle: { fontSize: 13, color: "#666974", lineHeight: 20 },
  content: { padding: 16, gap: 14 },
  card: { padding: 16, borderRadius: 16, backgroundColor: "#FFF", gap: 10 },
  name: { fontSize: 15, fontWeight: "600", color: "#1F2024" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  quantity: { flexDirection: "row", alignItems: "center", gap: 14 },
  step: { padding: 10, backgroundColor: "#FFF1EA", borderRadius: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#DADCE1",
    borderRadius: 12,
    padding: 14,
    color: "#1F2024",
  },
  footer: { padding: 16, gap: 10, backgroundColor: "#FFF" },
  button: {
    backgroundColor: "#FF6B2C",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  disabled: { opacity: 0.45 },
  empty: { alignItems: "center", paddingVertical: 50, gap: 16 },
  warning: {
    color: "#9A3412",
    backgroundColor: "#FFF1EA",
    padding: 14,
    borderRadius: 12,
    lineHeight: 21,
  },
});
