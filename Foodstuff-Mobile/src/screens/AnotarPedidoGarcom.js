import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';

export default function PedidosKDS({ navigation }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregarPedidos = async () => {
    try {
      const res = await api.get('/pedidos');
      setPedidos(res.data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  const alterarStatus = async (pedido, status) => {
    try {
      await api.patch(`/pedidos/${pedido.id}/status`, { status });
      carregarPedidos();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o pedido.');
    }
  };

  const novos = pedidos.filter((p) => p.status === 'PENDING');
  const preparando = pedidos.filter((p) => p.status === 'PREPARING');
  const prontos = pedidos.filter((p) => p.status === 'READY');

  const statusTexto = {
    PENDING: 'NOVO',
    PREPARING: 'PREPARANDO',
    READY: 'PRONTO',
  };

  const renderPedido = ({ item }) => (
    <View style={s.card}>

      <View style={s.cardTopo}>
        <View>
          <Text style={s.mesa}>
            Mesa T-{item.mesa?.codigo || item.mesa_id}
          </Text>

          <Text style={s.info}>
            Pedido #{item.id}
          </Text>
        </View>

        <Text style={s.status}>
          {statusTexto[item.status]}
        </Text>
      </View>

      {item.itens?.map((produto, index) => (
        <Text key={index} style={s.produto}>
          <Text style={s.qtd}>
            {produto.quantidade}x
          </Text>{' '}
          {produto.produto?.nome || produto.nome}
        </Text>
      ))}

      {item.observacao && (
        <View style={s.observacao}>
          <Text style={s.obsTitulo}>OBSERVAÇÕES</Text>
          <Text style={s.obsTexto}>
            "{item.observacao}"
          </Text>
        </View>
      )}

      {item.status === 'PENDING' && (
        <TouchableOpacity
          style={s.btn}
          onPress={() => alterarStatus(item, 'PREPARING')}
        >
          <Text style={s.btnTxt}>Aceitar Pedido</Text>
        </TouchableOpacity>
      )}

      {item.status === 'PREPARING' && (
        <TouchableOpacity
          style={s.btnPronto}
          onPress={() => alterarStatus(item, 'READY')}
        >
          <Text style={s.btnProntoTxt}>Marcar Pronto</Text>
        </TouchableOpacity>
      )}

    </View>
  );

  return (
    <View style={s.container}>

      <View style={s.header}>
        <Text style={s.titulo}>🍴 Foodstuff KDS</Text>
        <Text style={s.hora}>🕐 {new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })}</Text>
      </View>

      <View style={s.filtros}>

        <View style={s.filtroAtivo}>
          <Text style={s.filtroAtivoTxt}>Novos</Text>
          <Text style={s.numeroAtivo}>{novos.length}</Text>
        </View>

        <View style={s.filtro}>
          <Text>Preparando</Text>
          <Text style={s.numero}>{preparando.length}</Text>
        </View>

        <View style={s.filtro}>
          <Text>Prontos</Text>
          <Text style={s.numero}>{prontos.length}</Text>
        </View>

      </View>

      {loading ? (
        <ActivityIndicator
          color="#EA5B25"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.lista}
          refreshing={atualizando}
          onRefresh={() => {
            setAtualizando(true);
            carregarPedidos();
          }}
          renderItem={renderPedido}
        />
      )}

      <View style={s.menu}>

        <TouchableOpacity onPress={() => navigation.navigate('Mesas')}>
          <Text>▦</Text>
          <Text>Mesas</Text>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={s.ativo}>☷</Text>
          <Text style={s.ativo}>Pedidos</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
          <Text>♙</Text>
          <Text>Perfil</Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 45,
    backgroundColor: '#fff',
  },

  titulo: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  hora: {
    color: '#6B7280',
    fontSize: 11,
  },

  filtros: {
    flexDirection: 'row',
    gap: 6,
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },

  filtro: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 7,
    padding: 9,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },

  filtroAtivo: {
    flex: 1,
    backgroundColor: '#EA5B25',
    borderRadius: 7,
    padding: 9,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },

  filtroAtivoTxt: {
    color: '#fff',
    fontWeight: '600',
  },

  numero: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 5,
    borderRadius: 5,
    fontSize: 11,
  },

  numeroAtivo: {
    backgroundColor: '#fff',
    color: '#EA5B25',
    paddingHorizontal: 5,
    borderRadius: 5,
    fontSize: 11,
  },

  lista: {
    padding: 10,
    paddingBottom: 80,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },

  cardTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  mesa: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  info: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },

  status: {
    backgroundColor: '#FDE8E0',
    color: '#EA5B25',
    fontSize: 9,
    fontWeight: '700',
    padding: 5,
    borderRadius: 5,
    overflow: 'hidden',
  },

  produto: {
    fontSize: 12,
    marginBottom: 5,
    color: '#374151',
  },

  qtd: {
    color: '#EA5B25',
    fontWeight: '700',
  },

  observacao: {
    borderWidth: 1,
    borderColor: '#F5B942',
    backgroundColor: '#FFFDF5',
    borderRadius: 6,
    padding: 8,
    marginTop: 5,
    marginBottom: 8,
  },

  obsTitulo: {
    color: '#C38A00',
    fontSize: 8,
    fontWeight: '700',
  },

  obsTexto: {
    fontSize: 10,
    marginTop: 2,
  },

  btn: {
    backgroundColor: '#EA5B25',
    borderRadius: 7,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 3,
  },

  btnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  btnPronto: {
    borderWidth: 1,
    borderColor: '#20B486',
    borderRadius: 7,
    paddingVertical: 10,
    alignItems: 'center',
  },

  btnProntoTxt: {
    fontWeight: '600',
    fontSize: 12,
  },

  menu: {
    height: 65,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  ativo: {
    color: '#EA5B25',
  },
});