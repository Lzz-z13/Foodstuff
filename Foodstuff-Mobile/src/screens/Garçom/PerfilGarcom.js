import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import LogoutButton from '../../components/header/LogoutButton';
import NavbarGarcom from '../../components/navbar/NavbarGarcom';

const LARANJA = '#FF5A1F';
const LARANJA_CLARO = '#FFB59A';
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const MIME_POR_EXTENSAO = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};
const MIMES_PERMITIDOS = new Set([
  ...Object.values(MIME_POR_EXTENSAO),
  'image/jpg',
]);

function obterMimeDaFoto(asset) {
  const mimeInformado = asset.mimeType?.toLowerCase();
  if (mimeInformado && MIMES_PERMITIDOS.has(mimeInformado)) {
    return mimeInformado;
  }

  const extensao = asset.uri.split('.').pop()?.toLowerCase();
  return MIME_POR_EXTENSAO[extensao] || '';
}

export default function PerfilGarcom({ navigation }) {
  const [perfil, setPerfil] = useState({
    name: '',
    phone: '',
    email: '',
    role: '',
  });
  const [perfilInicial, setPerfilInicial] = useState(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [erroPerfil, setErroPerfil] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarNova, setMostrarNova] = useState(false);

  const carregarPerfil = useCallback(async () => {
    setCarregandoPerfil(true);
    setErroPerfil('');
    try {
      const response = await api.getCurrentUser();
      const user = response.data?.data;
      if (!user) {
        throw new Error('A API não retornou os dados do perfil.');
      }

      const dados = {
        name: user.name || '',
        phone: String(user.phone || ''),
        email: user.email || '',
        role: user.role || '',
        photo: user.photo || '',
      };
      setPerfil(dados);
      setPerfilInicial(dados);
    } catch (error) {
      setErroPerfil(
        error?.response?.data?.message ||
          error.message ||
          'Não foi possível carregar seu perfil.',
      );
    } finally {
      setCarregandoPerfil(false);
    }
  }, []);

  const salvarFotoNoServidor = async (photo) => {
    setSalvando(true);

    try {
      const response = await api.patchUserPhoto(photo);
      const fotoSalva = response.data?.data?.photo ?? photo;

      const perfilAtualizado = { ...perfil, photo: fotoSalva };
      const perfilInicialAtualizado = perfilInicial
        ? { ...perfilInicial, photo: fotoSalva }
        : perfilAtualizado;

      setPerfil(perfilAtualizado);
      setPerfilInicial(perfilInicialAtualizado);

      try {
        const userCache = await SecureStore.getItemAsync('user');
        const dadosCache = userCache ? JSON.parse(userCache) : {};
        await SecureStore.setItemAsync(
          'user',
          JSON.stringify({ ...dadosCache, ...perfilAtualizado }),
        );
      } catch {
        // ignora falha local para não bloquear a atualização do servidor
      }

      DeviceEventEmitter.emit('userPhotoUpdated', fotoSalva || null);

      Alert.alert(
        'Sucesso',
        fotoSalva ? 'Foto atualizada com sucesso!' : 'Foto removida com sucesso!',
      );
    } catch (error) {
      Alert.alert(
        'Erro',
        error?.response?.data?.message || 'Não foi possível atualizar a foto.',
      );
    } finally {
      setSalvando(false);
    }
  };

  const alterarFoto = async () => {
    if (salvando) return;

    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          'Permissão necessária',
          'Permita o acesso às suas fotos para alterar a foto de perfil.',
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (resultado.canceled) return;

      const asset = resultado.assets?.[0];

      if (!asset?.base64) {
        Alert.alert('Erro', 'Não foi possível ler a imagem selecionada.');
        return;
      }

      const mime = obterMimeDaFoto(asset);

      if (!mime) {
        Alert.alert(
          'Formato não suportado',
          'Escolha uma imagem PNG, JPEG, GIF ou WEBP.',
        );
        return;
      }

      const tamanhoBytes = Math.ceil((asset.base64.length * 3) / 4);

      if (tamanhoBytes > MAX_FOTO_BYTES) {
        Alert.alert('Imagem muito grande', 'Escolha uma imagem de até 5 MB.');
        return;
      }

      await salvarFotoNoServidor(`data:${mime};base64,${asset.base64}`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria de fotos.');
    }
  };

  const removerFoto = () => {
    if (!perfil?.photo || salvando) return;

    Alert.alert('Remover foto', 'Deseja remover sua foto de perfil?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => salvarFotoNoServidor(null),
      },
    ]);
  };

  useEffect(() => {
    carregarPerfil();
  }, [carregarPerfil]);

  const cancelar = () => {
    if (navigation && navigation.goBack) navigation.goBack();
  };

  async function salvar() {
    const name = perfil.name.trim();
    const email = perfil.email.trim().toLowerCase();
    const phone = perfil.phone.replace(/\D/g, '');
    const alterouPerfil =
      name !== perfilInicial.name ||
      email !== perfilInicial.email ||
      phone !== perfilInicial.phone.replace(/\D/g, '');
    const informouSenha = Boolean(senhaAtual || novaSenha || confirmarSenha);

    if (!name || !email || !phone) {
      Alert.alert('Atenção', 'Preencha nome, telefone e e-mail.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Atenção', 'Informe um e-mail válido.');
      return;
    }
    if (!/^\d{11}$/.test(phone)) {
      Alert.alert('Atenção', 'O telefone deve conter DDD e 11 dígitos.');
      return;
    }
    if (informouSenha) {
      if (!senhaAtual || !novaSenha || !confirmarSenha) {
        Alert.alert('Atenção', 'Preencha os três campos de senha.');
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(novaSenha)) {
        Alert.alert(
          'Atenção',
          'A nova senha precisa ter ao menos 8 caracteres, uma letra maiúscula, uma minúscula e um caractere especial.',
        );
        return;
      }
      if (novaSenha !== confirmarSenha) {
        Alert.alert('Atenção', 'As senhas não coincidem.');
        return;
      }
    }
    if (!alterouPerfil && !informouSenha) {
      Alert.alert('Atenção', 'Nenhuma alteração foi feita.');
      return;
    }

    setSalvando(true);
    let perfilSalvo = false;
    let senhaSalva = false;
    const avisos = [];
    try {
      if (informouSenha) {
        const response = await api.patchUserPassword({
          current_password: senhaAtual,
          new_password: novaSenha,
        });
        senhaSalva = true;
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha('');

        const token = response.data?.token;
        if (!token) {
          throw new Error('A API não retornou o novo token de acesso.');
        }
        await SecureStore.setItemAsync('token', token);

        try {
          const userCache = await SecureStore.getItemAsync('user');
          if (userCache) {
            await SecureStore.setItemAsync(
              'user',
              JSON.stringify({ ...JSON.parse(userCache), first_login: 0 }),
            );
          }
        } catch {
          avisos.push('Não foi possível atualizar os dados salvos neste aparelho.');
        }
      }

      if (alterouPerfil) {
        await api.patchUserCredentials({ name, email, phone });
        perfilSalvo = true;
        const dadosAtualizados = { ...perfil, name, email, phone };
        setPerfil(dadosAtualizados);
        setPerfilInicial(dadosAtualizados);

        try {
          const userCache = await SecureStore.getItemAsync('user');
          const dadosCache = userCache ? JSON.parse(userCache) : perfilInicial;
          await SecureStore.setItemAsync(
            'user',
            JSON.stringify({ ...dadosCache, ...dadosAtualizados }),
          );
        } catch {
          avisos.push('Não foi possível atualizar os dados salvos neste aparelho.');
        }
      }

      Alert.alert(
        avisos.length ? 'Atenção' : 'Sucesso',
        avisos.length ? avisos.join('\n') : 'Alterações salvas com sucesso.',
      );
    } catch (error) {
      const mensagem =
        error?.response?.data?.message ||
        error.message ||
        'Não foi possível salvar as alterações.';
      Alert.alert(
        perfilSalvo || senhaSalva ? 'Atualização parcial' : 'Erro',
        perfilSalvo
          ? `Os dados pessoais foram salvos, mas houve um problema na sessão: ${mensagem}`
          : senhaSalva
            ? alterouPerfil
              ? `A senha foi atualizada, mas os dados pessoais não foram salvos: ${mensagem}`
              : `A senha foi atualizada, mas não foi possível atualizar a sessão local: ${mensagem}`
            : mensagem,
      );
    } finally {
      setSalvando(false);
    }
  }

  const cargo =
    {
      MANAGER: 'Gerente',
      WAITER: 'Garçom',
      KITCHEN: 'Cozinha',
      CASHIER: 'Caixa',
    }[perfil.role] || perfil.role;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={cancelar}
          style={styles.voltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitulo}>Minha Conta</Text>

        <LogoutButton navigation={navigation} style={styles.logoutButton} />
      </View>

      {carregandoPerfil ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color={LARANJA} />
          <Text style={styles.estadoTexto}>Carregando perfil...</Text>
        </View>
      ) : erroPerfil ? (
        <View style={styles.estado}>
          <Text style={styles.erroTexto}>{erroPerfil}</Text>
          <TouchableOpacity
            style={styles.botaoTentarNovamente}
            onPress={carregarPerfil}
          >
            <Text style={styles.botaoSalvarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.conteudo}>
          <Text style={styles.titulo}>Minha Conta</Text>
          <Text style={styles.subtitulo}>
            Atualize suas informações pessoais ou altere sua senha.
          </Text>

          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrap}>
              {perfil.photo ? (
                <Image source={{ uri: perfil.photo }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person-circle-outline" size={64} color={LARANJA} />
              )}
            </View>

            <View style={styles.avatarActions}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={alterarFoto}
                disabled={salvando}
              >
                <Text style={styles.avatarButtonText}>
                  {perfil.photo ? 'Alterar Foto' : 'Adicionar Foto'}
                </Text>
              </TouchableOpacity>

              {perfil.photo ? (
                <TouchableOpacity
                  style={[styles.avatarButton, styles.avatarButtonSecondary]}
                  onPress={removerFoto}
                  disabled={salvando}
                >
                  <Text style={styles.avatarButtonTextSecondary}>Remover Foto</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <Text style={styles.secao}>Dados Pessoais</Text>

          <Text style={styles.label}>Nome Completo</Text>
          <TextInput
            style={[styles.input, styles.inputEscuro]}
            value={perfil.name}
            onChangeText={(name) => setPerfil((atual) => ({ ...atual, name }))}
            autoCapitalize="words"
            editable={!salvando}
          />

          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={[styles.input, styles.inputEscuro]}
            value={perfil.phone}
            onChangeText={(phone) =>
              setPerfil((atual) => ({
                ...atual,
                phone: phone.replace(/\D/g, ''),
              }))
            }
            keyboardType="phone-pad"
            maxLength={11}
            editable={!salvando}
          />

          <Text style={styles.label}>E-mail Corporativo</Text>
          <TextInput
            style={styles.input}
            value={perfil.email}
            onChangeText={(email) =>
              setPerfil((atual) => ({ ...atual, email }))
            }
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!salvando}
          />

          <Text style={styles.label}>Cargo / Função</Text>
          <TextInput
            style={[styles.input, styles.inputEscuro]}
            value={cargo}
            editable={false}
          />

          <View style={styles.divisor} />

          <Text style={styles.secao}>Segurança e Senha</Text>

          <Text style={styles.label}>Senha Atual</Text>
          <View style={styles.inputIcone}>
            <Ionicons name="lock-closed-outline" size={14} color="#777" />
            <TextInput
              style={styles.inputInterno}
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              placeholder="Digite sua senha atual"
              placeholderTextColor="#999"
              secureTextEntry
              editable={!salvando}
            />
          </View>

          <Text style={styles.label}>Nova Senha</Text>
          <View style={[styles.inputIcone, styles.bordaLaranja]}>
            <Ionicons name="lock-closed-outline" size={14} color="#777" />
            <TextInput
              style={styles.inputInterno}
              value={novaSenha}
              onChangeText={setNovaSenha}
              placeholder="8+ caracteres, maiúscula, minúscula e símbolo"
              placeholderTextColor="#999"
              secureTextEntry={!mostrarNova}
              autoCapitalize="none"
              editable={!salvando}
            />
            <TouchableOpacity
              onPress={() => setMostrarNova(!mostrarNova)}
              accessibilityRole="button"
              accessibilityLabel={mostrarNova ? 'Ocultar senha' : 'Mostrar senha'}
            >
              <Ionicons
                name={mostrarNova ? 'eye-outline' : 'eye-off-outline'}
                size={16}
                color="#777"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar Nova Senha</Text>
          <View style={[styles.inputIcone, styles.bordaLaranja]}>
            <Ionicons name="lock-closed-outline" size={14} color="#777" />
            <TextInput
              style={styles.inputInterno}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              placeholder="Digite novamente"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
              editable={!salvando}
            />
          </View>

          <View style={styles.botoes}>
            <TouchableOpacity
              style={styles.botaoCancelar}
              onPress={cancelar}
              disabled={salvando}
            >
              <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
              onPress={salvar}
              disabled={salvando}
            >
              {salvando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botaoSalvarTexto}>Salvar Alterações</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
      <NavbarGarcom navigation={navigation} activeTab="Perfil" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  voltar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },

  estado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  estadoTexto: { marginTop: 12, color: '#555', fontSize: 13 },
  erroTexto: { color: '#B42318', fontSize: 13, textAlign: 'center' },
  botaoTentarNovamente: {
    marginTop: 16,
    backgroundColor: LARANJA,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  avatarContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF0EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: LARANJA_CLARO,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarActions: {
    width: '100%',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  avatarButton: {
    backgroundColor: LARANJA,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 134,
    alignItems: 'center',
  },
  avatarButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: LARANJA_CLARO,
  },
  avatarButtonText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  avatarButtonTextSecondary: {
    fontSize: 11,
    color: LARANJA,
    fontWeight: '700',
  },

  conteudo: { paddingHorizontal: 16, paddingBottom: 24 },
  titulo: { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 4 },
  subtitulo: { fontSize: 11, color: '#555', marginTop: 4, marginBottom: 14 },
  secao: { fontSize: 12, fontWeight: '700', color: '#111', marginBottom: 10 },

  label: { fontSize: 11, color: '#111', marginTop: 12, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: LARANJA_CLARO,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 11,
    color: '#111',
    backgroundColor: '#fff',
  },
  inputEscuro: { borderColor: '#555' },

  inputIcone: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 4,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  bordaLaranja: { borderColor: LARANJA_CLARO },
  inputInterno: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 11,
    color: '#111',
  },

  divisor: {
    height: 1,
    backgroundColor: LARANJA_CLARO,
    marginTop: 18,
    marginBottom: 14,
  },

  botoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  botaoCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botaoCancelarTexto: { fontSize: 11, color: '#111' },
  botaoSalvar: {
    flex: 1.6,
    backgroundColor: LARANJA,
    borderRadius: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botaoDesabilitado: { opacity: 0.7 },
  botaoSalvarTexto: { fontSize: 11, color: '#fff', fontWeight: '700' },
});