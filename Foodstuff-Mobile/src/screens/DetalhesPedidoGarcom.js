import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import api from '../services/api';

const brl = (v) =>
  `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

const hora = (data) =>
  data
    ? new Date(data).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Pendente';

export default function DetalhesPedido({ route, navigation }) {
  const { id } = route.params;
  const [pedido, setPedido] = useState(null);

  useEffect(() => {
    api
      .get(`/pedidos/${id}`)
      .then((res) => setPedido(res.data))
      .catch(() =>
        Alert.alert(
          'Erro',
          'Não foi possível carregar o pedido.'
        )
      );
  }, [id]);

  const solicitarConta = async () => {
    try {
      await api.post(`/pedidos/${id}/conta`);

      Alert.alert(
        'Conta solicitada',
        'O caixa foi avisado.'
      );

      navigation.goBack();
    } catch {
      Alert.alert(
        'Erro',
        'Falha ao solicitar a conta.'
      );
    }
  };

  if (!pedido) {
    return (
      <ActivityIndicator
        color="#EA5B25"
        style={{ flex: 1 }}
      />
    );
  }

  const etapas = [
    {
      n: 1,
      nome: 'Recebido',
      hora: pedido.recebido_em,
    },
    {
      n: 2,
      nome: 'Na Cozinha',
      hora: pedido.cozinha_em,
    },
    {
      n: 3,
      nome: 'Pronto',
      hora: pedido.pronto_em,
    },
  ];

  const total = pedido.itens.reduce(
    (soma, item) =>
      soma + item.quantidade * item.preco,
    0
  );

  return (
    <View style={s.container}>

      <ScrollView>

        <View style={s.header}>
          <View>
            <Text style={s.titulo}>
              Pedido #{pedido.id}
            </Text>

            <Text style={s.sub}>
              Informações completas do envio
            </Text>
          </View>

          <Text style={s.badge}>
            Mesa {pedido.mesa?.codigo}
          </Text>
        </View>

        <Text style={s.secao}>
          STATUS DO PREPARO
        </Text>

        <View style={s.etapas}>
          {etapas.map((item) => (
            <View key={item.n} style={s.etapa}>

              <View
                style={[
                  s.circulo,
                  !item.hora && s.circuloPendente,
                ]}
              >
                <Text style={s.circuloTxt}>
                  {item.n}
                </Text>
              </View>

              <View>
                <Text style={s.etapaNome}>
                  {item.nome}
                </Text>

                <Text style={s.etapaHora}>
                  {hora(item.hora)}
                </Text>
              </View>

            </View>
          ))}
        </View>

        {pedido.observacao && (
          <View style={s.obs}>
            <Text style={s.obsTit}>
              INSTRUÇÕES ESPECIAIS
            </Text>

            <Text style={s.obsTxt}>
              "{pedido.observacao}"
            </Text>
          </View>
        )}

        <Text style={s.secao}>
          ITENS DO PEDIDO
        </Text>

        <View style={s.itens}>
          {pedido.itens.map((item, index) => (
            <View key={index} style={s.itemRow}>

              <Text style={s.itemTxt}>
                <Text style={s.qtd}>
                  {item.quantidade}x{' '}
                </Text>
                {item.nome}
              </Text>

              <Text style={s.itemTxt}>
                {brl(
                  item.quantidade * item.preco
                )}
              </Text>

            </View>
          ))}

          <View style={[s.itemRow, s.totalRow]}>
            <Text style={s.totalLbl}>
              Total do Pedido
            </Text>

            <Text style={s.totalVal}>
              {brl(total)}
            </Text>
          </View>
        </View>

      </ScrollView>

      <View style={s.botoes}>

        <TouchableOpacity
          style={[s.btn, s.btnOutline]}
          onPress={() =>
            navigation.navigate(
              'AnotarPedido',
              { mesa: pedido.mesa }
            )
          }
        >
          <Text style={s.btnOutlineTxt}>
            Adicionar Item
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, s.btnPrimario]}
          onPress={solicitarConta}
        >
          <Text style={s.btnPrimarioTxt}>
            Solicitar Conta
          </Text>
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

  badge: {
    backgroundColor: '#FDE8E0',
    color: '#EA5B25',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },

  secao: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
  },

  etapas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },

  etapa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  circulo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EA5B25',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circuloPendente: {
    backgroundColor: '#9CA3AF',
  },

  circuloTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  etapaNome: {
    fontWeight: '700',
    fontSize: 12,
    color: '#111827',
  },

  etapaHora: {
    fontSize: 10,
    color: '#6B7280',
  },

  obs: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FBBF24',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },

  obsTit: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 11,
  },

  obsTxt: {
    color: '#374151',
    marginTop: 2,
  },

  itens: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },

  itemTxt: {
    color: '#111827',
  },

  qtd: {
    color: '#EA5B25',
    fontWeight: '700',
  },

  totalRow: {
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 10,
  },

  totalLbl: {
    fontWeight: '800',
    color: '#111827',
  },

  totalVal: {
    fontWeight: '800',
    color: '#EA5B25',
    fontSize: 16,
  },

  botoes: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
  },

  btn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },

  btnOutline: {
    borderWidth: 1,
    borderColor: '#EA5B25',
  },

  btnOutlineTxt: {
    color: '#EA5B25',
    fontWeight: '700',
  },

  btnPrimario: {
    backgroundColor: '#EA5B25',
  },

  btnPrimarioTxt: {
    color: '#fff',
    fontWeight: '700',
  },
});