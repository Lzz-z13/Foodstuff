import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import LogoutButton from '../../components/header/LogoutButton';

const PRODUTOS = [
  { id: 1, nome: 'Burger Clássico', preco: 28.9 },
  { id: 2, nome: 'Batata Frita', preco: 16.5 },
  { id: 3, nome: 'Refrigerante Lata', preco: 8.5 },
  { id: 4, nome: 'Água Mineral', preco: 5.0 },
  { id: 5, nome: 'Salada Caesar', preco: 22.0 },
  { id: 6, nome: 'Café Expresso', preco: 7.5 },
];

export default function AnotarPedidoGarcom({ route, navigation }) {
  const pedidoId =
    route?.params?.pedidoId ?? route?.params?.id ?? route?.params?.pedido?.id ?? '—';
  const [itensSelecionados, setItensSelecionados] = useState([]);

  const total = useMemo(
    () =>
      itensSelecionados.reduce(
        (soma, item) => soma + item.preco * item.quantidade,
        0,
      ),
    [itensSelecionados],
  );

  const adicionarProduto = (produto) => {
    setItensSelecionados((atual) => {
      const itemExistente = atual.find((item) => item.id === produto.id);

      if (itemExistente) {
        return atual.map((item) =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item,
        );
      }

      return [...atual, { ...produto, quantidade: 1 }];
    });
  };

  const removerProduto = (id) => {
    setItensSelecionados((atual) =>
      atual
        .map((item) =>
          item.id === id
            ? { ...item, quantidade: item.quantidade - 1 }
            : item,
        )
        .filter((item) => item.quantidade > 0),
    );
  };

  const confirmarItens = () => {
    if (!itensSelecionados.length) {
      Alert.alert('Atenção', 'Selecione pelo menos um item antes de confirmar.');
      return;
    }

    Alert.alert(
      'Itens adicionados',
      `Pedido #${pedidoId} foi atualizado com ${itensSelecionados.length} item(ns).`,
    );
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Adicionar Itens</Text>
        <LogoutButton navigation={navigation} />
      </View>

      <View style={styles.pedidoInfo}>
        <Text style={styles.pedidoTexto}>Pedido #{pedidoId}</Text>
        <Text style={styles.pedidoSub}>Selecione os itens para incluir no pedido.</Text>
      </View>

      <FlatList
        data={PRODUTOS}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.nomeProduto}>{item.nome}</Text>
              <Text style={styles.precoProduto}>
                R$ {item.preco.toFixed(2).replace('.', ',')}
              </Text>
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

      <View style={styles.resumo}>
        <Text style={styles.resumoTitulo}>Resumo</Text>

        {itensSelecionados.length === 0 ? (
          <Text style={styles.vazio}>Nenhum item selecionado.</Text>
        ) : (
          itensSelecionados.map((item) => (
            <View key={item.id} style={styles.itemResumo}>
              <Text style={styles.itemResumoTexto}>
                {item.quantidade}x {item.nome}
              </Text>
              <TouchableOpacity onPress={() => removerProduto(item.id)}>
                <Text style={styles.removerTexto}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalTexto}>Total</Text>
          <Text style={styles.totalValor}>R$ {total.toFixed(2).replace('.', ',')}</Text>
        </View>

        <TouchableOpacity style={styles.botaoConfirmar} onPress={confirmarItens}>
          <Text style={styles.botaoConfirmarTexto}>Confirmar itens</Text>
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

  nomeProduto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
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

  botaoConfirmarTexto: {
    color: '#fff',
    fontWeight: '800',
  },

});