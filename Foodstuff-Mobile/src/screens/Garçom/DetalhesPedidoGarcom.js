import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import sheets from "../../services/api";

const brl = (valor) =>
  `R$ ${Number(valor || 0)
    .toFixed(2)
    .replace(".", ",")}`;

export default function DetalhesPedido({ route, navigation }) {
  const pedidoId =
    route?.params?.pedidoId ?? route?.params?.id ?? route?.params?.pedido?.id;

  const [pedido, setPedido] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [solicitandoConta, setSolicitandoConta] = useState(false);

  useEffect(() => {
    carregarPedido();
  }, [pedidoId]);

  async function carregarPedido() {
    if (!pedidoId) {
      setCarregando(false);
      Alert.alert("Erro", "Não foi possível identificar o pedido.");
      return;
    }

    try {
      setCarregando(true);
      const resposta = await sheets.getPedido(pedidoId);
      setPedido(resposta.data?.pedido ?? resposta.data);
    } catch (error) {
      console.log("Erro ao carregar pedido:", error);
      Alert.alert("Erro", "Não foi possível carregar os detalhes do pedido.");
    } finally {
      setCarregando(false);
    }
  }

  async function solicitarConta() {
    try {
      setSolicitandoConta(true);
      await sheets.postSolicitarConta(pedidoId);

      Alert.alert("Sucesso", "Solicitação de conta enviada!");
      carregarPedido();
    } catch (error) {
      console.log("Erro ao solicitar conta:", error);
      Alert.alert(
        "Erro",
        error.response?.data?.message || "Não foi possível solicitar a conta.",
      );
    } finally {
      setSolicitandoConta(false);
    }
  }

  function adicionarItem() {
    navigation.navigate("AnotarPedido", {
      pedidoId,
      pedido,
    });
  }

  if (carregando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B2C" />
        <Text style={styles.loadingText}>Carregando pedido...</Text>
      </View>
    );
  }

  if (!pedido) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Não foi possível encontrar este pedido.</Text>

        <TouchableOpacity
          style={styles.botaoVoltarErro}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.textoBotao}>Voltar para pedidos</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itens = pedido.itens || pedido.items || [];

  const total = itens.reduce((soma, item) => {
    const quantidade = Number(item.quantidade || 1);
    const preco = Number(
      item.preco ??
        item.preco_unitario ??
        item.valor ??
        item.preco_unitario_atual ??
        0,
    );

    return soma + quantidade * preco;
  }, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Detalhes do pedido</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Pedido</Text>
          <Text style={styles.valor}>
            #{pedido.id ?? pedido.order_id ?? pedidoId}
          </Text>

          <Text style={styles.label}>Mesa</Text>
          <Text style={styles.valor}>
            {pedido.mesa?.numero ??
              pedido.mesa?.codigo ??
              pedido.numero_mesa ??
              pedido.mesa_numero ??
              (typeof pedido.mesa === "object" && pedido.mesa !== null
                ? pedido.mesa.codigo
                : pedido.mesa) ??
              "Não informada"}
          </Text>

          <Text style={styles.label}>Status</Text>
          <Text style={styles.status}>{pedido.status ?? "Em andamento"}</Text>
        </View>

        <Text style={styles.subtitulo}>Itens do pedido</Text>

        <View style={styles.card}>
          {itens.length > 0 ? (
            itens.map((item, index) => {
              const quantidade = Number(item.quantidade || 1);
              const preco = Number(
                item.preco ??
                  item.preco_unitario ??
                  item.valor ??
                  item.preco_unitario_atual ??
                  0,
              );

              return (
                <View
                  key={item.id ?? item.id_produto ?? index}
                  style={styles.item}
                >
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemNome}>
                      {item.nome ??
                        item.nome_produto ??
                        item.produto?.nome ??
                        "Produto"}
                    </Text>

                    <Text style={styles.itemQuantidade}>
                      Quantidade: {quantidade}
                    </Text>
                  </View>

                  <Text style={styles.itemPreco}>
                    {brl(quantidade * preco)}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.vazio}>
              Nenhum item encontrado neste pedido.
            </Text>
          )}

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total dos itens</Text>
            <Text style={styles.totalValor}>{brl(total)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.botoesContainer}>
        <TouchableOpacity
          style={[styles.botao, styles.botaoVoltar]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back-outline" size={18} color="#FFFFFF" />
          <Text style={styles.textoBotao}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botao, styles.botaoAdicionar]}
          onPress={adicionarItem}
          activeOpacity={0.8}
        >
          <Ionicons name="add-outline" size={18} color="#FFFFFF" />
          <Text style={styles.textoBotao}>Adicionar item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botao, styles.botaoConta]}
          onPress={solicitarConta}
          disabled={solicitandoConta}
          activeOpacity={0.8}
        >
          {solicitandoConta ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
              <Text style={styles.textoBotao}>Solicitar conta</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },

  scroll: {
    flex: 1,
  },

  conteudo: {
    padding: 16,
    paddingBottom: 20,
  },

  titulo: {
    fontSize: 23,
    fontWeight: "700",
    color: "#1F2024",
    marginBottom: 20,
  },

  subtitulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2024",
    marginTop: 20,
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
  },

  label: {
    fontSize: 13,
    color: "#777777",
    marginTop: 8,
  },

  valor: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2024",
    marginTop: 4,
  },

  status: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF6B2C",
    marginTop: 4,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDF0",
    gap: 8,
  },

  itemInfo: {
    flex: 1,
  },

  itemNome: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2024",
  },

  itemQuantidade: {
    fontSize: 12,
    color: "#777777",
    marginTop: 4,
  },

  itemPreco: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2024",
  },

  vazio: {
    fontSize: 14,
    color: "#777777",
    paddingVertical: 12,
  },

  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#ECEDF0",
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2024",
  },

  totalValor: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B2C",
  },

  botoesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#ECEDF0",
  },

  botao: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    paddingVertical: 6,
    gap: 3,
  },

  botaoVoltar: {
    backgroundColor: "#6B7280",
  },

  botaoAdicionar: {
    backgroundColor: "#FF6B2C",
  },

  botaoConta: {
    backgroundColor: "#16A34A",
  },

  textoBotao: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F6F8",
    padding: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#777777",
  },

  botaoVoltarErro: {
    backgroundColor: "#6B7280",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
});
