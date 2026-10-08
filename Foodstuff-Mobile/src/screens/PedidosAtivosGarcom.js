import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import Navbar from '../components/navbar/Navbar';

const FILTROS = ['Todos', 'Preparando', 'Prontos', 'Entregues'];

const STATUS = {
  preparando: { label: 'PREPARANDO', bg: '#FEF3C7', cor: '#D97706' },
  pronto: { label: 'PRONTO', bg: '#D1FAE5', cor: '#059669' },
  entregue: { label: 'ENTREGUE', bg: '#E5E7EB', cor: '#6B7280' },
};

const filtroStatus = {
  Preparando: 'preparando',
  Prontos: 'pronto',
  Entregues: 'entregue',
};

const minutos = (data) =>
  Math.max(
    0,
    Math.round((Date.now() - new Date(data).getTime()) / 60000)
  );

export default function PedidosAtivos({ navigation }) {
  const [filtro, setFiltro] = useState('Todos');
  const [pedidos, setPedidos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setRefreshing(true);

      const { data } = await api.get('/pedidos');

      setPedidos(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os pedidos.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const entregar = async (id) => {
    try {
      await api.patch(`/pedidos/${id}`, {
        status: 'entregue',
      });

      carregar();
    } catch {
      Alert.alert('Erro', 'Falha ao entregar o pedido.');
    }
  };

  const lista = pedidos.filter(
    (p) =>
      filtro === 'Todos' ||
      p.status === filtroStatus[filtro]
  );

  return (
    <View style={s.container}>

      <View style={s.header}>
        <Text style={s.titulo}>Meus Pedidos</Text>
        <Text style={s.sub}>
          Monitoramento em tempo real
        </Text>
      </View>

      <View style={s.filtros}>
        {FILTROS.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              s.filtro,
              filtro === item && s.filtroAtivo,
            ]}
            onPress={() => setFiltro(item)}
          >
            <Text style={s.filtroTxt}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={lista}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.lista}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={carregar}
          />
        }
        ListEmptyComponent={
          <Text style={s.vazio}>
            Nenhum pedido encontrado.
          </Text>
        }
        renderItem={({ item }) => {
          const status =
            STATUS[item.status] || STATUS.preparando;

          return (
            <View style={s.card}>

              <View style={s.linha}>

                <View>
                  <Text style={s.mesa}>
                    Mesa {item.mesa?.codigo}
                  </Text>

                  <Text style={s.info}>
                    Pedido #{item.id} • Há{' '}
                    {minutos(item.criado_em)} min
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
                {item.itens
                  ?.map(
                    (i) =>
                      `${i.quantidade}x ${i.nome}`
                  )
                  .join(', ')}
              </Text>

              {item.status === 'pronto' ? (
                <TouchableOpacity
                  style={s.btn}
                  onPress={() => entregar(item.id)}
                >
                  <Text style={s.btnTxt}>
                    Entregar Pedido
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.btnOutline}
                  onPress={() =>
                    navigation.navigate(
                      'DetalhesPedido',
                      { id: item.id }
                    )
                  }
                >
                  <Text style={s.btnOutlineTxt}>
                    Ver Detalhes
                  </Text>
                </TouchableOpacity>
              )}

            </View>
          );
        }}
      />

      <Navbar />

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },

  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },

  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  sub: {
    color: '#6B7280',
    marginTop: 2,
  },

  filtros: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },

  filtro: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },

  filtroAtivo: {
    borderColor: '#EA5B25',
    backgroundColor: '#FDE8E0',
  },

  filtroTxt: {
    fontWeight: '600',
    fontSize: 12,
    color: '#111827',
  },

  lista: {
    padding: 16,
    paddingBottom: 80,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },

  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  mesa: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  info: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },

  tag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },

  itens: {
    color: '#374151',
    marginVertical: 10,
    fontSize: 13,
  },

  btn: {
    backgroundColor: '#EA5B25',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },

  btnTxt: {
    color: '#fff',
    fontWeight: '700',
  },

  btnOutline: {
    borderWidth: 1,
    borderColor: '#9CA3AF',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },

  btnOutlineTxt: {
    color: '#111827',
    fontWeight: '600',
  },

  vazio: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
  },
});