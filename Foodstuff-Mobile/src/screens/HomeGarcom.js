import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

/* ------------------------------------------------------------------ */
/* Endpoints – ajuste aqui se as rotas do seu back-end forem diferentes */
/* ------------------------------------------------------------------ */
const ENDPOINTS = {
  garcom: '/garcom/me', // { nome, turno, estabelecimento }
  desempenho: '/garcom/desempenho', // { ativos, atendidas, tempo_medio } (tempo em minutos)
  mesas: '/mesas', // [{ id, numero, status }]
};

const INTERVALO_ATUALIZACAO = 15000; // 15s

const LARANJA = '#FF5A1F';

/* Configuração visual de cada status de mesa */
const STATUS = {
  livre: {
    rotulo: 'LIVRE',
    descricao: 'Desocupada',
    cor: '#1E9E6A',
    fundo: '#DDF5EA',
  },
  ocupada: {
    rotulo: 'OCUPADA',
    descricao: 'Atendido',
    cor: '#1B8FB5',
    fundo: '#D9F0F8',
  },
  aguardando: {
    rotulo: 'AGUARDANDO',
    descricao: 'Atendendo',
    cor: '#E0A100',
    fundo: '#FFF1CC',
  },
  conta: {
    rotulo: 'CONTA',
    descricao: 'Pagar',
    cor: '#D93636',
    fundo: '#FBDADA',
  },
};

/* Aceita variações de nome que a API possa devolver */
function normalizarStatus(valor) {
  const s = String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (['livre', 'disponivel', 'free', 'desocupada'].includes(s)) return 'livre';
  if (['ocupada', 'ocupado', 'occupied', 'atendido'].includes(s)) return 'ocupada';
  if (['aguardando', 'atendendo', 'waiting', 'esperando'].includes(s)) return 'aguardando';
  if (['conta', 'pagar', 'pagamento', 'fechando', 'bill'].includes(s)) return 'conta';
  return 'livre';
}

function formatarTempo(minutos) {
  const m = Math.round(Number(minutos) || 0);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const resto = String(m % 60).padStart(2, '0');
  return `${h}h${resto}m`;
}

function formatarNumeroMesa(mesa) {
  const n = mesa.numero ?? mesa.id;
  return `Mesa T-${String(n).padStart(2, '0')}`;
}

function turnoPeloHorario() {
  const h = new Date().getHours();
  if (h >= 6 && h < 11) return 'Café da manhã';
  if (h >= 11 && h < 16) return 'Almoço';
  if (h >= 16 && h < 18) return 'Tarde';
  return 'Jantar';
}

function primeiroNome(nome) {
  return String(nome || '').trim().split(' ')[0] || 'Garçom';
}

export default function Dashboard({ navigation }) {
  const [garcom, setGarcom] = useState(null);
  const [desempenho, setDesempenho] = useState({
    ativos: 0,
    atendidas: 0,
    tempoMedio: 0,
  });
  const [mesas, setMesas] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState(null);

  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const carregarDados = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!silencioso) setErro(null);

      try {
        const [respGarcom, respDesempenho, respMesas] = await Promise.all([
          api.get(ENDPOINTS.garcom),
          api.get(ENDPOINTS.desempenho),
          api.get(ENDPOINTS.mesas),
        ]);

        if (!montado.current) return;

        setGarcom(respGarcom.data);

        const d = respDesempenho.data || {};
        setDesempenho({
          ativos: d.ativos ?? 0,
          atendidas: d.atendidas ?? 0,
          tempoMedio: d.tempo_medio ?? d.tempoMedio ?? 0,
        });

        const lista = Array.isArray(respMesas.data)
          ? respMesas.data
          : respMesas.data?.mesas || [];

        setMesas(
          lista
            .map((m) => ({ ...m, statusKey: normalizarStatus(m.status) }))
            .sort((a, b) => Number(a.numero ?? a.id) - Number(b.numero ?? b.id))
        );
        setErro(null);
      } catch (e) {
        if (!montado.current) return;

        // Sessão expirada → volta para o login
        if (e?.response?.status === 401) {
          navigation.reset({ index: 0, routes: [{ name: 'LoginGarcom' }] });
          return;
        }

        // Em atualização silenciosa mantém os dados antigos na tela
        if (!silencioso) {
          setErro('Não foi possível carregar os dados. Verifique sua conexão.');
        }
      } finally {
        if (montado.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    [navigation]
  );

  // Carrega ao entrar na tela e atualiza automaticamente enquanto ela estiver em foco
  useFocusEffect(
    useCallback(() => {
      carregarDados();
      const timer = setInterval(
        () => carregarDados({ silencioso: true }),
        INTERVALO_ATUALIZACAO
      );
      return () => clearInterval(timer);
    }, [carregarDados])
  );

  const aoPuxarParaAtualizar = () => {
    setAtualizando(true);
    carregarDados();
  };

  const abrirMesa = (mesa) => {
    navigation.navigate('Pedidos', {
      mesaId: mesa.id,
      mesaNumero: mesa.numero ?? mesa.id,
      status: mesa.statusKey,
    });
  };

  /* ------------------------------ Render ------------------------------ */

  if (carregando) {
    return (
      <SafeAreaView style={[styles.safe, styles.centro]}>
        <ActivityIndicator size="large" color={LARANJA} />
        <Text style={styles.carregandoTexto}>Carregando mesas...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoPuxarParaAtualizar}
            colors={[LARANJA]}
            tintColor={LARANJA}
          />
        }
      >
        {/* Cabeçalho */}
        <Text style={styles.ola}>Olá, {primeiroNome(garcom?.nome)}!</Text>
        <Text style={styles.turno}>
          Turno: {garcom?.turno || turnoPeloHorario()} •{' '}
          {garcom?.estabelecimento || 'Foodstuff'}
        </Text>

        {erro && (
          <TouchableOpacity style={styles.erroBox} onPress={() => carregarDados()}>
            <Ionicons name="alert-circle-outline" size={16} color="#D93636" />
            <Text style={styles.erroTexto}>{erro} Toque para tentar novamente.</Text>
          </TouchableOpacity>
        )}

        {/* Desempenho do turno */}
        <Text style={styles.secao}>DESEMPENHO DO TURNO</Text>
        <View style={styles.cardsLinha}>
          <View style={styles.cardResumo}>
            <Text style={styles.cardNumero}>{desempenho.ativos}</Text>
            <Text style={styles.cardRotulo}>Ativos</Text>
          </View>
          <View style={styles.cardResumo}>
            <Text style={styles.cardNumero}>{desempenho.atendidas}</Text>
            <Text style={styles.cardRotulo}>Atendidas</Text>
          </View>
          <View style={styles.cardResumo}>
            <Text style={styles.cardNumero}>{formatarTempo(desempenho.tempoMedio)}</Text>
            <Text style={styles.cardRotulo}>T. Médio</Text>
          </View>
        </View>

        {/* Mesas */}
        <Text style={styles.secao}>MESAS DO SISTEMA</Text>

        {mesas.length === 0 && !erro ? (
          <Text style={styles.vazio}>Nenhuma mesa cadastrada.</Text>
        ) : (
          <View style={styles.mesasGrid}>
            {mesas.map((mesa) => {
              const cfg = STATUS[mesa.statusKey];
              return (
                <TouchableOpacity
                  key={String(mesa.id)}
                  style={styles.mesaCard}
                  activeOpacity={0.7}
                  onPress={() => abrirMesa(mesa)}
                >
                  <View style={styles.mesaTopo}>
                    <Text style={styles.mesaTitulo}>{formatarNumeroMesa(mesa)}</Text>
                    <View style={[styles.tag, { backgroundColor: cfg.fundo }]}>
                      <Text style={[styles.tagTexto, { color: cfg.cor }]}>
                        {cfg.rotulo}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.mesaBase}>
                    <Ionicons name="person-outline" size={11} color="#444" />
                    <Text style={styles.mesaDescricao}>{cfg.descricao}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Navbar inferior (pode ser substituída por src/components/navbar/Navbar.js) */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="grid" size={18} color={LARANJA} />
          <Text style={[styles.navTexto, { color: LARANJA }]}>Mesas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Pedidos')}
        >
          <Ionicons name="list-outline" size={18} color="#333" />
          <Text style={styles.navTexto}>Pedidos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Perfil')}
        >
          <Ionicons name="person-outline" size={18} color="#333" />
          <Text style={styles.navTexto}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  centro: { alignItems: 'center', justifyContent: 'center' },
  carregandoTexto: { marginTop: 10, fontSize: 12, color: '#555' },

  conteudo: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 24 },

  ola: { fontSize: 16, fontWeight: '800', color: '#111' },
  turno: { fontSize: 11, color: '#555', marginTop: 3, marginBottom: 16 },

  erroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FBDADA',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  erroTexto: { flex: 1, fontSize: 11, color: '#8A1F1F' },

  secao: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 4,
  },

  cardsLinha: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  cardResumo: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardNumero: { fontSize: 18, fontWeight: '800', color: '#111' },
  cardRotulo: { fontSize: 10, color: '#666', marginTop: 4 },

  vazio: { fontSize: 12, color: '#777', textAlign: 'center', marginTop: 20 },

  mesasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mesaCard: {
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  mesaTopo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mesaTitulo: { fontSize: 14, fontWeight: '800', color: '#111' },
  tag: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  tagTexto: { fontSize: 7, fontWeight: '800' },
  mesaBase: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  mesaDescricao: { fontSize: 10, color: '#444' },

  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  navItem: { alignItems: 'center' },
  navTexto: { fontSize: 9, color: '#333', marginTop: 2, fontWeight: '600' },
});