import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import LogoutButton from '../../components/header/LogoutButton';
import sheets from '../../services/api';

const brl = (valor) =>
  `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;

export default function AnotarPedidoGarcom({ route, navigation }) {
  const pedidoId =
    route?.params?.pedidoId ?? route?.params?.id ?? route?.params?.pedido?.id ?? '—';
  const pedidoParams = route?.params?.pedido ?? null;

  // O novo pedido é criado dentro da comanda à qual o pedido atual pertence.
  const commandIdRef = useRef(
    route?.params?.commandId ?? pedidoParams?.command_id ?? null,
  );
  const [commandId, setCommandId] = useState(commandIdRef.current);
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [itensSelecionados, setItensSelecionados] = useState([]);

  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);

      // Busca a comanda do pedido caso ela não tenha vindo na navegação.
      if (!commandIdRef.current && pedidoId !== '—') {
        try {
          const respostaPedido = await sheets.getPedido(pedidoId);
          const pedidoCarregado =
            respostaPedido.data?.data ?? respostaPedido.data;
          commandIdRef.current = pedidoCarregado?.command_id ?? null;
          setCommandId(commandIdRef.current);
        } catch (erroPedido) {
          console.log('Erro ao carregar pedido:', erroPedido);
        }
      }

      const respostaProdutos = await sheets.getProducts({ is_available: 1 });
      const lista = respostaProdutos?.data?.data;
      setProdutos(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.log('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos.');
    } finally {
      setCarregando(false);
    }
  }, [pedidoId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const total = useMemo(
    () =>
      itensSelecionados.reduce(
        (soma, item) => soma + Number(item.price || 0) * item.quantidade,
        0,
      ),
    [itensSelecionados],
  );

  const adicionarProduto = (produto) => {
    setItensSelecionados((atual) => {
      const itemExistente = atual.find(
        (item) => item.product_id === produto.product_id,
      );

      if (itemExistente) {
        return atual.map((item) =>
          item.product_id === produto.product_id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        );
      }

      return [...atual, { ...produto, quantidade: 1 }];
    });
  };

  const removerProduto = (product_id) => {
    setItensSelecionados((atual) =>
      atual
        .map((item) =>
          item.product_id === product_id
            ? { ...item, quantidade: item.quantidade - 1 }
            : item,
        )
        .filter((item) => item.quantidade > 0),
    );
  };

  const confirmarItens = async () => {
    if (!itensSelecionados.length) {
      Alert.alert('Atenção', 'Selecione pelo menos um item antes de confirmar.');
      return;
    }

    if (!commandIdRef.current) {
      Alert.alert('Erro', 'Não foi possível identificar a comanda deste pedido.');
      return;
    }

    try {
      setEnviando(true);

      await sheets.postCommandOrder(
        commandIdRef.current,
        itensSelecionados.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantidade),
        })),
      );

      Alert.alert('Sucesso', 'Pedido adicionado à comanda com sucesso.');
      navigation.goBack();
    } catch (error) {
      console.log('Erro ao adicionar itens:', error?.response?.data || error);
      Alert.alert(
        'Erro',
        error?.response?.data?.message ||
          'Não foi possível adicionar os itens ao pedido.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Adicionar Itens</Text>
        <LogoutButton navigation={navigation} />
      </View>

      <View style={styles.pedidoInfo}>
        <Text style={styles.pedidoTexto}>
          Pedido #{pedidoId}
          {commandId ? ` • Comanda #${commandId}` : ''}
        </Text>
        <Text style={styles.pedidoSub}>
          Selecione os itens para incluir na comanda.
        </Text>
      </View>

      {carregando ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#EA5B25" />
          <Text style={styles.loadingText}>Carregando produtos...</Text>
        </View>
      ) : (
        <FlatList
          data={produtos}
          keyExtractor={(item) => String(item.product_id)}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={styles.vazioLista}>
              Nenhum produto disponível no momento.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.nomeProduto}>{item.name}</Text>
                {item.category_name ? (
                  <Text style={styles.categoriaProduto}>
                    {item.category_name}
                  </Text>
                ) : null}
                <Text style={styles.precoProduto}>{brl(item.price)}</Text>
              </View>

              <TouchableOpacity
                style={styles.botaoAdicionar}
                onPress={() => adicionarProduto(item)}
              >
                <Text style={styles.botaoAdicionarTexto}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View style={styles.resumo}>
        <Text style={styles.resumoTitulo}>Resumo</Text>

        {itensSelecionados.length === 0 ? (
          <Text style={styles.vazio}>Nenhum item selecionado.</Text>
        ) : (
          itensSelecionados.map((item) => (
            <View key={item.product_id} style={styles.itemResumo}>
              <Text style={styles.itemResumoTexto}>
                {item.quantidade}x {item.name}
              </Text>
              <TouchableOpacity onPress={() => removerProduto(item.product_id)}>
                <Text style={styles.removerTexto}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalTexto}>Total</Text>
          <Text style={styles.totalValor}>{brl(total)}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.botaoConfirmar,
            (enviando || !itensSelecionados.length) &&
              styles.botaoConfirmarDesabilitado,
          ]}
          onPress={confirmarItens}
          disabled={enviando || !itensSelecionados.length}
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.botaoConfirmarTexto}>Confirmar itens</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },

  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  pedidoInfo: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  pedidoTexto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  pedidoSub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },

  vazioLista: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
  },

  lista: {
    padding: 16,
    paddingBottom: 20,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },

  cardInfo: {
    flex: 1,
    paddingRight: 12,
  },

  nomeProduto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  categoriaProduto: {
    marginTop: 2,
    color: '#6B7280',
    fontSize: 12,
  },

  precoProduto: {
    marginTop: 4,
    color: '#EA5B25',
    fontWeight: '700',
  },

  botaoAdicionar: {
    backgroundColor: '#EA5B25',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  botaoAdicionarTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  resumo: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },

  resumoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  vazio: {
    marginTop: 8,
    color: '#6B7280',
  },

  itemResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  itemResumoTexto: {
    color: '#374151',
    fontSize: 13,
  },

  removerTexto: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  totalTexto: {
    fontWeight: '700',
    color: '#111827',
  },

  totalValor: {
    color: '#EA5B25',
    fontWeight: '800',
  },

  botaoConfirmar: {
    backgroundColor: '#EA5B25',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },

  botaoConfirmarDesabilitado: {
    backgroundColor: '#D1D5DB',
  },

  botaoConfirmarTexto: {
    color: '#fff',
    fontWeight: '800',
  },
});
