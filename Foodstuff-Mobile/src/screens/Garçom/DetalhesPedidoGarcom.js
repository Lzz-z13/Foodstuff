import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import sheets from "../../services/api";

const brl = (valor) =>
  `R$ ${Number(valor || 0)
    .toFixed(2)
    .replace(".", ",")}`;

const STATUS_PEDIDO = {
  PENDING: "Pendente",
  PREPARING: "Preparando",
  READY: "Pronto",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};

const STATUS_COMANDA = {
  OPEN: "Aberta",
  CLOSED: "Fechada (conta solicitada)",
  PAID: "Paga",
  CANCELLED: "Cancelada",
};

const precoItem = (item) =>
  Number(
    item.preco ??
      item.preco_unitario ??
      item.valor ??
      item.preco_unitario_atual ??
      item.unit_price ??
      0,
  );

export default function DetalhesPedido({ route, navigation }) {
  const pedidoId =
    route?.params?.pedidoId ?? route?.params?.id ?? route?.params?.pedido?.id;

  const [pedido, setPedido] = useState(null);
  const [comanda, setComanda] = useState(null);
  const [pedidosDaComanda, setPedidosDaComanda] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [solicitandoConta, setSolicitandoConta] = useState(false);

  const carregarDetalhes = useCallback(async () => {
    if (!pedidoId) {
      setCarregando(false);
      Alert.alert("Erro", "Não foi possível identificar o pedido.");
      return;
    }

    try {
      setCarregando(true);

      // O pedido de entrada identifica a comanda: a tela mostra a comanda
      // inteira, porque novos itens são gravados como novos pedidos dela.
      const resposta = await sheets.getPedido(pedidoId);
      const pedidoCarregado = resposta.data?.data ?? resposta.data;

      setPedido(pedidoCarregado);
      setComanda(null);
      setPedidosDaComanda([]);

      const commandId = pedidoCarregado?.command_id;

      if (!commandId) {
        return;
      }

      const respostaPedidos = await sheets.getPedidos();
      const todos = Array.isArray(respostaPedidos.data)
        ? respostaPedidos.data
        : [];

      setPedidosDaComanda(
        todos.filter(
          (pedidoComanda) =>
            String(pedidoComanda.command_id) === String(commandId),
        ),
      );

      // A comanda define se ainda é possível adicionar itens ou solicitar
      // a conta. Se ela não carregar, os botões seguem habilitados e a API
      // continua validando no servidor.
      try {
        const respostaComanda = await sheets.getCommand(commandId);
        setComanda(respostaComanda.data?.data ?? respostaComanda.data);
      } catch (erroComanda) {
        console.log("Erro ao carregar comanda:");
      }
    } catch (error) {
      console.log("Erro ao carregar pedido:");
      Alert.alert("Erro", "Não foi possível carregar os detalhes do pedido.");
    } finally {
      setCarregando(false);
    }
  }, [pedidoId]);

  // Recarrega ao voltar de "Anotar pedido" para refletir os itens adicionados.
  useFocusEffect(
    useCallback(() => {
      carregarDetalhes();
    }, [carregarDetalhes]),
  );

  async function solicitarConta() {
    try {
      setSolicitandoConta(true);
      await sheets.postSolicitarConta(pedidoId);

      Alert.alert(
        "Conta solicitada",
        "A comanda foi fechada. O cliente pode finalizar o pagamento no caixa.",
      );
      await carregarDetalhes();
    } catch (error) {
      console.log("Erro ao solicitar conta:");
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
        <Text style={styles.loadingText}>Carregando comanda...</Text>
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

  const comandaEncerrada = Boolean(comanda) && comanda.status !== "OPEN";

  const textoBotaoConta = comanda
    ? comanda.status === "CLOSED"
      ? "Conta solicitada"
      : comanda.status === "PAID"
        ? "Comanda paga"
        : comanda.status === "CANCELLED"
          ? "Comanda cancelada"
          : "Solicitar conta"
    : "Solicitar conta";

  const totalComanda = pedidosDaComanda
    .filter((pedidoComanda) => pedidoComanda.status !== "CANCELLED")
    .reduce((soma, pedidoComanda) => {
      const itens = pedidoComanda.itens || pedidoComanda.items || [];

      return (
        soma +
        itens.reduce(
          (subtotal, item) =>
            subtotal + Number(item.quantidade || 1) * precoItem(item),
          0,
        )
      );
    }, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Detalhes da comanda</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Mesa</Text>
          <Text style={styles.valor}>
            {pedido.mesa?.codigo ?? pedido.table_number ?? "Não informada"}
          </Text>

          <Text style={styles.label}>Cliente</Text>
          <Text style={styles.valor}>
            {comanda?.customer_name || "Não informado"}
          </Text>

          <Text style={styles.label}>Comanda</Text>
          <Text style={styles.valor}>
            {pedido.command_id ? `#${pedido.command_id}` : "Não informada"}
          </Text>

          <Text style={styles.label}>Status da comanda</Text>
          <Text
            style={[
              styles.status,
              comandaEncerrada && styles.statusComandaEncerrada,
            ]}
          >
            {comanda
              ? (STATUS_COMANDA[comanda.status] ?? comanda.status)
              : "Não informada"}
          </Text>
        </View>

        <Text style={styles.subtitulo}>Pedidos da comanda</Text>

        {pedidosDaComanda.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.vazio}>
              Nenhum pedido encontrado nesta comanda.
            </Text>
          </View>
        ) : (
          pedidosDaComanda.map((pedidoComanda) => {
            const itens = pedidoComanda.itens || pedidoComanda.items || [];
            const cancelado = pedidoComanda.status === "CANCELLED";
            const statusPedido =
              STATUS_PEDIDO[pedidoComanda.status] ?? pedidoComanda.status;
            const subtotal = itens.reduce(
              (soma, item) =>
                soma + Number(item.quantidade || 1) * precoItem(item),
              0,
            );

            return (
              <View key={pedidoComanda.id ?? pedidoComanda.order_id} style={styles.card}>
                <Text style={styles.pedidoNumero}>
                  {`Pedido #${pedidoComanda.id ?? pedidoComanda.order_id} • ${statusPedido}`}
                </Text>

                {itens.length > 0 ? (
                  itens.map((item, index) => (
                    <View
                      key={item.id ?? item.id_produto ?? index}
                      style={[styles.item, cancelado && styles.itemCancelado]}
                    >
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemNome}>
                          {item.nome ??
                            item.nome_produto ??
                            item.produto?.nome ??
                            "Produto"}
                        </Text>

                        <Text style={styles.itemQuantidade}>
                          Quantidade: {Number(item.quantidade || 1)}
                        </Text>
                      </View>

                      <Text style={styles.itemPreco}>
                        {brl(Number(item.quantidade || 1) * precoItem(item))}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.vazio}>
                    Nenhum item encontrado neste pedido.
                  </Text>
                )}

                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValor}>{brl(subtotal)}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.card}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total da comanda</Text>
            <Text style={styles.totalValor}>{brl(totalComanda)}</Text>
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
          style={[
            styles.botao,
            styles.botaoAdicionar,
            comandaEncerrada && styles.botaoDesabilitado,
          ]}
          onPress={adicionarItem}
          disabled={comandaEncerrada}
          activeOpacity={0.8}
        >
          <Ionicons name="add-outline" size={18} color="#FFFFFF" />
          <Text style={styles.textoBotao}>
            {comandaEncerrada ? "Comanda fechada" : "Adicionar item"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.botao,
            styles.botaoConta,
            (comandaEncerrada || solicitandoConta) && styles.botaoDesabilitado,
          ]}
          onPress={solicitarConta}
          disabled={solicitandoConta || comandaEncerrada}
          activeOpacity={0.8}
        >
          {solicitandoConta ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
              <Text style={styles.textoBotao}>{textoBotaoConta}</Text>
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

  statusComandaEncerrada: {
    color: "#6B7280",
  },

  pedidoNumero: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2024",
    marginBottom: 4,
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

  itemCancelado: {
    opacity: 0.5,
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

  botaoDesabilitado: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
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
