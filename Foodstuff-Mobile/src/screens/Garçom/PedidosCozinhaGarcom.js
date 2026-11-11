import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import api from "../../services/api";

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);

  const carregarPedidos = async () => {
    try {
      const { data } = await api.get("/pedidos");
      setPedidos(data);
    } catch (error) {
      Alert.alert(
        "Erro",
        error?.response?.data?.message || "Não foi possível carregar os pedidos.",
      );
    }
  };

  const alterarStatus = async (id, status) => {
    try {
      await api.patch(`/pedidos/${id}/status`, { status });
      carregarPedidos();
    } catch (error) {
      Alert.alert(
        "Erro",
        error?.response?.data?.message || "Não foi possível atualizar o pedido.",
      );
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  // A cozinha só acompanha pedidos com itens que precisam de preparo.
  const pedidosCozinha = pedidos.filter((p) => p.needs_kitchen);

  const novos = pedidosCozinha.filter(p => p.status === "PENDING");
  const preparando = pedidosCozinha.filter(p => p.status === "PREPARING");
  const prontos = pedidosCozinha.filter(p => p.status === "READY");

  const renderPedido = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.topoCard}>
        <View>
          <Text style={styles.mesa}>
            Mesa T-{item.table_number}
          </Text>

          <Text style={styles.info}>
            Pedido #{item.order_id}
          </Text>
        </View>

        <Text style={styles.status}>
          {item.status === "PENDING"
            ? "NOVO"
            : item.status === "PREPARING"
            ? "PREPARANDO"
            : "PRONTO"}
        </Text>
      </View>

      {item.items?.map((produto, index) => (
        <Text key={index} style={styles.produto}>
          <Text style={styles.quantidade}>
            {produto.quantity}x{" "}
          </Text>
          {produto.product_name}
        </Text>
      ))}

      {item.observations && (
        <View style={styles.obs}>
          <Text>OBSERVAÇÕES</Text>
          <Text>"{item.observations}"</Text>
        </View>
      )}

      {item.status === "PENDING" && (
        <TouchableOpacity
          style={styles.botao}
          onPress={() =>
            alterarStatus(item.order_id, "PREPARING")
          }
        >
          <Text style={styles.botaoTexto}>
            Aceitar Pedido
          </Text>
        </TouchableOpacity>
      )}

      {item.status === "PREPARING" && (
        <TouchableOpacity
          style={styles.botaoPronto}
          onPress={() =>
            alterarStatus(item.order_id, "READY")
          }
        >
          <Text>Marcar Pronto</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.titulo}>🍴 Foodstuff KDS</Text>
      </View>

      <View style={styles.filtros}>
        <Text>Novos {novos.length}</Text>
        <Text>Preparando {preparando.length}</Text>
        <Text>Prontos {prontos.length}</Text>
      </View>

      <FlatList
        data={pedidosCozinha}
        renderItem={renderPedido}
        keyExtractor={item => String(item.order_id)}
      />

      <View style={styles.menu}>
        <Text>▦{"\n"}Mesas</Text>
        <Text style={styles.ativo}>☷{"\n"}Pedidos</Text>
        <Text>♙{"\n"}Perfil</Text>
      </View>

    </View>
  );
}

// estilização geral.

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6FA",
  },

  header: {
    backgroundColor: "#FFF",
    padding: 18,
  },

  titulo: {
    fontSize: 16,
    fontWeight: "bold",
  },

  filtros: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFF",
    padding: 12,
  },

  card: {
    backgroundColor: "#FFF",
    margin: 10,
    padding: 12,
    borderRadius: 10,
  },

  topoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  mesa: {
    fontSize: 16,
    fontWeight: "bold",
  },

  info: {
    color: "#777",
    fontSize: 11,
  },

  status: {
    color: "#F15A24",
    fontSize: 10,
  },

  produto: {
    marginTop: 7,
    fontSize: 12,
  },

  quantidade: {
    color: "#F15A24",
    fontWeight: "bold",
  },

  obs: {
    borderWidth: 1,
    borderColor: "#F5B942",
    padding: 8,
    marginTop: 10,
    borderRadius: 6,
  },

  botao: {
    backgroundColor: "#F15A24",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    alignItems: "center",
  },

  botaoTexto: {
    color: "#FFF",
    fontWeight: "bold",
  },

  botaoPronto: {
    borderWidth: 1,
    borderColor: "#20B486",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    alignItems: "center",
  },

  menu: {
    height: 65,
    backgroundColor: "#FFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  ativo: {
    color: "#F15A24",
  },
});