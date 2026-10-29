import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../../services/api";
import LogoutButton from "../../components/header/LogoutButton";
import NavbarGarcom from "../../components/navbar/NavbarGarcom";

const FILTROS = [
  "Todos",
  "Preparando",
  "Prontos",
  "Entregues",
  "Pendentes",
  "Cancelados",
];

const STATUS = {
  pendente: {
    label: "PENDENTE",
    bg: "#DBEAFE",
    cor: "#2563EB",
  },
  preparando: {
    label: "PREPARANDO",
    bg: "#FEF3C7",
    cor: "#D97706",
  },
  pronto: {
    label: "PRONTO",
    bg: "#D1FAE5",
    cor: "#059669",
  },
  entregue: {
    label: "ENTREGUE",
    bg: "#E5E7EB",
    cor: "#6B7280",
  },
  cancelado: {
    label: "CANCELADO",
    bg: "#FEE2E2",
    cor: "#DC2626",
  },
};

const filtroStatus = {
  Preparando: "preparando",
  Prontos: "pronto",
  Entregues: "entregue",
  Pendentes: "pendente",
  Cancelados: "cancelado",
};

const normalizarStatus = {
  PENDING: "pendente",
  PREPARING: "preparando",
  READY: "pronto",
  DELIVERED: "entregue",
  CANCELLED: "cancelado",
};

const minutos = (data) => {
  if (!data) return 0;

  const timestamp = new Date(data).getTime();

  if (Number.isNaN(timestamp)) return 0;

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
};

export default function PedidosAtivosGarcom({ navigation }) {
  const [filtro, setFiltro] = useState("Todos");
  const [pedidos, setPedidos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setRefreshing(true);

      const { data } = await api.getPedidos();

      if (!Array.isArray(data)) {
        throw new Error("Formato inesperado na resposta da API.");
      }

      setPedidos(
        data.map((pedido) => {
          const statusOriginal = String(pedido.status || "").trim();

          const statusNormalizado =
            normalizarStatus[statusOriginal.toUpperCase()] ||
            statusOriginal.toLowerCase();

          return {
            ...pedido,
            status: statusNormalizado,
          };
        }),
      );
    } catch (error) {
      console.error(
        "Erro ao carregar pedidos:",
        error.response?.data || error.message,
      );

      Alert.alert(
        "Erro",
        "Não foi possível carregar os pedidos. Tente novamente.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const entregar = async (id) => {
    try {
      await api.patchPedidoStatus(id, {
        status: "DELIVERED",
      });

      await carregar();
    } catch (error) {
      console.error(
        "Erro ao entregar pedido:",
        error.response?.data || error.message,
      );

      Alert.alert("Erro", "Não foi possível atualizar o status do pedido.");
    }
  };

  const lista = pedidos.filter(
    (pedido) => filtro === "Todos" || pedido.status === filtroStatus[filtro],
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.headerText}>
          <Text style={s.titulo}>Meus Pedidos</Text>
          <Text style={s.sub}>Acompanhe o status dos pedidos</Text>
        </View>
        <LogoutButton navigation={navigation} />
      </View>

      <View style={s.filtros}>
        <FlatList
          horizontal
          data={FILTROS}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtrosConteudo}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.filtro, filtro === item && s.filtroAtivo]}
              onPress={() => setFiltro(item)}
            >
              <Text style={[s.filtroTxt, filtro === item && s.filtroTxtAtivo]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={lista}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.lista}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={carregar} />
        }
        ListEmptyComponent={
          <Text style={s.vazio}>Nenhum pedido encontrado.</Text>
        }
        renderItem={({ item }) => {
          const status = STATUS[item.status] || STATUS.pendente;

          return (
            <View style={s.card}>
              <View style={s.linha}>
                <View style={s.dadosPedido}>
                  <Text style={s.mesa}>
                    Mesa {item.mesa?.codigo ?? item.table_number ?? "—"}
                  </Text>

                  <Text style={s.info}>
                    Pedido #{item.id ?? item.order_id} • Há{" "}
                    {minutos(item.criado_em ?? item.created_at)} min
                  </Text>
                </View>

                <Text
                  style={[
                    s.tag,
                    {
                      backgroundColor: status.bg,
                      color: status.cor,
                    },
                  ]}
                >
                  {status.label}
                </Text>
              </View>

              <Text style={s.itens}>
                {item.itens?.length
                  ? item.itens
                      .map(
                        (i) =>
                          `${i.quantidade ?? i.quantity}x ${i.nome ?? i.name}`,
                      )
                      .join(", ")
                  : "Nenhum item informado."}
              </Text>

              {item.status === "pronto" ? (
                <TouchableOpacity
                  style={s.btn}
                  onPress={() => entregar(item.id ?? item.order_id)}
                >
                  <Text style={s.btnTxt}>Entregar Pedido</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.btnOutline}
                  onPress={() =>
                    navigation.navigate("DetalhesPedido", {
                      id: item.id ?? item.order_id,
                    })
                  }
                >
                  <Text style={s.btnOutlineTxt}>Ver Detalhes</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      <NavbarGarcom navigation={navigation} activeTab="Pedidos" />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },

  headerText: {
    flex: 1,
  },

  titulo: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  sub: {
    color: "#6B7280",
    marginTop: 2,
  },

  filtros: {
    paddingVertical: 12,
  },

  filtrosConteudo: {
    paddingHorizontal: 16,
    gap: 8,
  },

  filtro: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },

  filtroAtivo: {
    borderColor: "#EA5B25",
    backgroundColor: "#FDE8E0",
  },

  filtroTxt: {
    fontWeight: "600",
    fontSize: 12,
    color: "#111827",
  },

  filtroTxtAtivo: {
    color: "#C2410C",
  },

  lista: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },

  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },

  dadosPedido: {
    flex: 1,
  },

  mesa: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  info: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },

  tag: {
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: "hidden",
  },

  itens: {
    color: "#374151",
    marginVertical: 12,
    fontSize: 13,
  },

  btn: {
    backgroundColor: "#EA5B25",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },

  btnTxt: {
    color: "#fff",
    fontWeight: "700",
  },

  btnOutline: {
    borderWidth: 1,
    borderColor: "#9CA3AF",
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: "center",
  },

  btnOutlineTxt: {
    color: "#111827",
    fontWeight: "600",
  },

  vazio: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 40,
  },
});
