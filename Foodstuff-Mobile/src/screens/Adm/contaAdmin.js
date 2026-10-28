import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";

import Header from "../../components/header/Header";
import Navbar from "../../components/navbar/Navbar";
import api from "../../services/api";

const CARGO_LABELS = {
  MANAGER: "Administrador Geral",
  WAITER: "Garçom",
  KITCHEN: "Cozinha",
  CASHIER: "Caixa",
};

const NOTIFICACOES_PADRAO = {
  email: true,
  push: true,
  criticos: false,
};

const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const MIME_POR_EXTENSAO = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};
const MIMES_PERMITIDOS = new Set([
  ...Object.values(MIME_POR_EXTENSAO),
  "image/jpg",
]);

function obterMimeDaFoto(asset) {
  const mimeInformado = asset.mimeType?.toLowerCase();
  if (mimeInformado && MIMES_PERMITIDOS.has(mimeInformado)) {
    return mimeInformado;
  }

  const extensao = asset.uri.split(".").pop()?.toLowerCase();
  return MIME_POR_EXTENSAO[extensao] || "";
}

function dispositivoAtual() {
  const sistema =
    Platform.OS === "ios"
      ? "iOS"
      : Platform.OS === "android"
        ? "Android"
        : "Dispositivo";

  return `${sistema} ${Platform.Version ?? ""}`.trim();
}

export default function ContaAdmin({ navigation }) {
  // DADOS DO USUÁRIO
  const [usuario, setUsuario] = useState(null);
  const [dados, setDados] = useState({ nome: "", email: "", telefone: "" });
  const [dadosIniciais, setDadosIniciais] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [salvandoFoto, setSalvandoFoto] = useState(false);

  // SENHA
  const [senha, setSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [mostrarSenhas, setMostrarSenhas] = useState(false);

  // NOTIFICAÇÕES
  const [notificacoes, setNotificacoes] = useState(NOTIFICACOES_PADRAO);

  // SESSÕES
  const [sessoes, setSessoes] = useState([]);

  const carregarUsuario = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const response = await api.getCurrentUser();
      const user = response.data?.data;

      if (!user) {
        throw new Error("A API não retornou os dados do usuário.");
      }

      const dadosUsuario = {
        nome: user.name || "",
        email: user.email || "",
        telefone: String(user.phone || ""),
      };

      setUsuario(user);
      setDados(dadosUsuario);
      setDadosIniciais(dadosUsuario);

      await SecureStore.setItemAsync("user", JSON.stringify(user));
      DeviceEventEmitter.emit("userPhotoUpdated", user.photo || null);
    } catch (error) {
      setErro(
        error?.response?.data?.message ||
          error.message ||
          "Não foi possível carregar seus dados.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuario();
  }, [carregarUsuario]);

  // Carrega preferências locais de notificação da conta.
  useEffect(() => {
    if (!usuario) return;

    let ativo = true;

    async function carregarNotificacoes() {
      try {
        const salvo = await AsyncStorage.getItem(
          `notificacoes:${usuario.user_id || usuario.email}`,
        );
        if (ativo && salvo) {
          setNotificacoes({ ...NOTIFICACOES_PADRAO, ...JSON.parse(salvo) });
        }
      } catch (error) {
        console.log("Erro ao carregar notificações:", error);
      }
    }

    carregarNotificacoes();

    return () => {
      ativo = false;
    };
  }, [usuario]);

  // Registra a sessão atual no dispositivo, sem depender de rota de sessões
  // (a API não expõe esse recurso).
  useEffect(() => {
    if (!usuario) return;

    let ativo = true;

    async function carregarSessoes() {
      const chave = `sessoes:${usuario.user_id || usuario.email}`;

      try {
        const salvo = await AsyncStorage.getItem(chave);
        const anteriores = salvo ? JSON.parse(salvo) : [];
        const outras = Array.isArray(anteriores)
          ? anteriores.filter((item) => item && item.id !== "atual")
          : [];

        const lista = [
          {
            id: "atual",
            dispositivo: dispositivoAtual(),
            detalhe: "Esta sessão",
            quando: "Ativo agora",
            atual: true,
          },
          ...outras,
        ].slice(0, 5);

        await AsyncStorage.setItem(chave, JSON.stringify(lista));
        if (ativo) setSessoes(lista);
      } catch (error) {
        console.log("Erro ao carregar sessões:", error);
        if (ativo) {
          setSessoes([
            {
              id: "atual",
              dispositivo: dispositivoAtual(),
              detalhe: "Esta sessão",
              quando: "Ativo agora",
              atual: true,
            },
          ]);
        }
      }
    }

    carregarSessoes();

    return () => {
      ativo = false;
    };
  }, [usuario]);

  const atualizarDados = (campo, valor) =>
    setDados((atual) => ({ ...atual, [campo]: valor }));

  const alternarNotificacao = async (campo) => {
    const atualizadas = {
      ...notificacoes,
      [campo]: !notificacoes[campo],
    };
    setNotificacoes(atualizadas);

    if (!usuario) return;

    try {
      await AsyncStorage.setItem(
        `notificacoes:${usuario.user_id || usuario.email}`,
        JSON.stringify(atualizadas),
      );
    } catch (error) {
      console.log("Erro ao salvar notificações:", error);
      Alert.alert(
        "Erro",
        "Não foi possível salvar a preferência de notificação.",
      );
    }
  };

  const salvarFotoNoServidor = async (photo) => {
    setSalvandoFoto(true);

    try {
      const response = await api.patchUserPhoto(photo);
      const fotoSalva = response.data?.data?.photo ?? photo;

      const usuarioAtualizado = { ...usuario, photo: fotoSalva };
      setUsuario(usuarioAtualizado);
      await SecureStore.setItemAsync(
        "user",
        JSON.stringify(usuarioAtualizado),
      );

      DeviceEventEmitter.emit("userPhotoUpdated", fotoSalva || null);

      Alert.alert(
        "Sucesso",
        fotoSalva
          ? "Foto atualizada com sucesso!"
          : "Foto removida com sucesso!",
      );
    } catch (error) {
      console.log("Erro ao atualizar foto:", error);

      Alert.alert(
        "Erro",
        error.response?.data?.message ||
          "Não foi possível atualizar a foto.",
      );
    } finally {
      setSalvandoFoto(false);
    }
  };

  const alterarFoto = async () => {
    if (salvandoFoto) return;

    try {
      const permissao =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita o acesso às suas fotos para alterar a foto de perfil.",
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (resultado.canceled) return;

      const asset = resultado.assets?.[0];

      if (!asset?.base64) {
        Alert.alert("Erro", "Não foi possível ler a imagem selecionada.");
        return;
      }

      const mime = obterMimeDaFoto(asset);

      if (!mime) {
        Alert.alert(
          "Formato não suportado",
          "Escolha uma imagem PNG, JPEG, GIF ou WEBP.",
        );
        return;
      }

      const tamanhoBytes = Math.ceil((asset.base64.length * 3) / 4);

      if (tamanhoBytes > MAX_FOTO_BYTES) {
        Alert.alert(
          "Imagem muito grande",
          "Escolha uma imagem de até 5 MB.",
        );
        return;
      }

      await salvarFotoNoServidor(`data:${mime};base64,${asset.base64}`);
    } catch (error) {
      console.log("Erro ao selecionar foto:", error);
      Alert.alert("Erro", "Não foi possível abrir a galeria de fotos.");
    }
  };

  const removerFoto = () => {
    if (!usuario?.photo || salvandoFoto) return;

    Alert.alert(
      "Remover foto",
      "Deseja remover sua foto de perfil?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => salvarFotoNoServidor(null),
        },
      ],
    );
  };

  // SALVAR DADOS
  const salvar = async () => {
    const nome = dados.nome.trim();
    const email = dados.email.trim().toLowerCase();
    const telefone = dados.telefone.replace(/\D/g, "");

    if (!nome || !email || !telefone) {
      Alert.alert("Atenção", "Preencha nome, e-mail e telefone.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Atenção", "Informe um e-mail válido.");
      return;
    }

    if (!/^\d{11}$/.test(telefone)) {
      Alert.alert("Atenção", "O telefone deve conter DDD e 11 dígitos.");
      return;
    }

    const payload = {};
    if (nome !== dadosIniciais?.nome) payload.name = nome;
    if (email !== dadosIniciais?.email) payload.email = email;
    if (telefone !== dadosIniciais?.telefone.replace(/\D/g, "")) {
      payload.phone = telefone;
    }

    if (Object.keys(payload).length === 0) {
      Alert.alert("Atenção", "Nenhuma alteração para salvar.");
      return;
    }

    setSalvandoDados(true);

    try {
      await api.patchUserCredentials(payload);

      const usuarioAtualizado = { ...usuario, ...payload };
      const dadosAtualizados = { nome, email, telefone };

      setUsuario(usuarioAtualizado);
      setDados(dadosAtualizados);
      setDadosIniciais(dadosAtualizados);

      await SecureStore.setItemAsync(
        "user",
        JSON.stringify(usuarioAtualizado),
      );

      Alert.alert("Sucesso", "Dados atualizados com sucesso!");
    } catch (error) {
      console.log("Erro ao atualizar:", error);

      Alert.alert(
        "Erro",
        error.response?.data?.message ||
          "Não foi possível atualizar seus dados.",
      );
    } finally {
      setSalvandoDados(false);
    }
  };

  // ALTERAR SENHA
  const alterarSenha = async () => {
    if (!senha || !novaSenha || !confirmar) {
      Alert.alert("Atenção", "Preencha todos os campos de senha.");
      return;
    }

    if (novaSenha !== confirmar) {
      Alert.alert("Erro", "As novas senhas não são iguais.");
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(novaSenha)) {
      Alert.alert(
        "Atenção",
        "A nova senha precisa ter ao menos 8 caracteres, uma letra maiúscula, uma minúscula e um caractere especial.",
      );
      return;
    }

    setSalvandoSenha(true);

    try {
      const response = await api.patchUserPassword({
        current_password: senha,
        new_password: novaSenha,
      });

      // A API zera o first_login e devolve um token novo. Sem atualizar o
      // token local o usuário continua bloqueado pelo verifyFirstLogin.
      const token = response.data?.token;
      if (token) {
        await SecureStore.setItemAsync("token", token);
      }

      const usuarioAtualizado = { ...usuario, first_login: 0 };
      setUsuario(usuarioAtualizado);
      await SecureStore.setItemAsync(
        "user",
        JSON.stringify(usuarioAtualizado),
      );

      setSenha("");
      setNovaSenha("");
      setConfirmar("");

      Alert.alert("Sucesso", "Senha alterada com sucesso!");
    } catch (error) {
      console.log("Erro ao alterar senha:", error);

      Alert.alert(
        "Erro",
        error.response?.data?.message ||
          "Não foi possível alterar a senha.",
      );
    } finally {
      setSalvandoSenha(false);
    }
  };

  const cargo = CARGO_LABELS[usuario?.role] || usuario?.role || "—";
  const primeiroAcesso = Number(usuario?.first_login) === 1;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header navigation={navigation} />

      {carregando ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color="#FF6B2C" />
          <Text style={styles.estadoTexto}>Carregando seus dados...</Text>
        </View>
      ) : erro ? (
        <View style={styles.estado}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity style={styles.button} onPress={carregarUsuario}>
            <Text style={styles.white}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Configurações</Text>

          {primeiroAcesso && (
            <View style={styles.aviso}>
              <Text style={styles.avisoTexto}>
                Primeiro acesso: altere sua senha abaixo para desbloquear o
                sistema.
              </Text>
            </View>
          )}

          {/* MINHA CONTA */}
          <View style={styles.card}>
            <Text style={styles.section}>Minha Conta</Text>

            <View style={styles.avatar}>
              {usuario?.photo ? (
                <Image
                  source={{ uri: usuario.photo }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={35} color="#888" />
              )}

              {salvandoFoto && (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator color="#FFF" />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.photo, salvandoFoto && styles.disabledButton]}
              onPress={alterarFoto}
              disabled={salvandoFoto}
            >
              <Text style={styles.white}>
                {usuario?.photo ? "Alterar Foto" : "Adicionar Foto"}
              </Text>
            </TouchableOpacity>

            {usuario?.photo ? (
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={removerFoto}
                disabled={salvandoFoto}
              >
                <Text style={styles.removePhotoText}>Remover Foto</Text>
              </TouchableOpacity>
            ) : null}

            <Campo
              titulo="Nome Completo"
              valor={dados.nome}
              alterar={(valor) => atualizarDados("nome", valor)}
            />

            <Campo
              titulo="E-mail Corporativo"
              valor={dados.email}
              alterar={(valor) => atualizarDados("email", valor)}
              tipo="email"
            />

            <Campo
              titulo="Telefone"
              valor={dados.telefone}
              alterar={(valor) =>
                atualizarDados("telefone", valor.replace(/\D/g, ""))
              }
              tipo="phone"
            />

            <Campo titulo="Cargo / Função" valor={cargo} bloqueado />

            <TouchableOpacity
              style={[styles.button, salvandoDados && styles.disabledButton]}
              onPress={salvar}
              disabled={salvandoDados}
            >
              {salvandoDados ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.white}>Salvar Alterações</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* SEGURANÇA */}
          <View style={styles.card}>
            <Text style={styles.section}>Segurança</Text>

            <Campo
              titulo="Senha Atual"
              valor={senha}
              alterar={setSenha}
              senha={!mostrarSenhas}
            />

            <Campo
              titulo="Nova Senha"
              valor={novaSenha}
              alterar={setNovaSenha}
              senha={!mostrarSenhas}
            />

            <View style={styles.campoComIcone}>
              <View style={styles.flexUm}>
                <Campo
                  titulo="Confirmar Nova Senha"
                  valor={confirmar}
                  alterar={setConfirmar}
                  senha={!mostrarSenhas}
                />
              </View>

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setMostrarSenhas((valor) => !valor)}
                accessibilityRole="button"
                accessibilityLabel={
                  mostrarSenhas ? "Ocultar senhas" : "Mostrar senhas"
                }
              >
                <Ionicons
                  name={mostrarSenhas ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#777"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Use ao menos 8 caracteres, com letra maiúscula, minúscula e
              caractere especial.
            </Text>

            <TouchableOpacity
              style={[styles.button, salvandoSenha && styles.disabledButton]}
              onPress={alterarSenha}
              disabled={salvandoSenha}
            >
              {salvandoSenha ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.white}>Alterar Senha</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* NOTIFICAÇÕES */}
          <View style={styles.card}>
            <Text style={styles.section}>Preferências de Notificação</Text>

            <Opcao
              texto="Notificações por E-mail"
              valor={notificacoes.email}
              alterar={() => alternarNotificacao("email")}
            />

            <Opcao
              texto="Alertas Push"
              valor={notificacoes.push}
              alterar={() => alternarNotificacao("push")}
            />

            <Opcao
              texto="Alertas Críticos"
              valor={notificacoes.criticos}
              alterar={() => alternarNotificacao("criticos")}
            />
          </View>

          {/* SESSÕES */}
          <View style={styles.card}>
            <Text style={styles.section}>Sessões Ativas</Text>

            {sessoes.map((sessao) => (
              <View key={sessao.id} style={styles.session}>
                <View style={styles.flexUm}>
                  <View style={styles.sessionTitulo}>
                    <Text style={styles.sessionDispositivo}>
                      {sessao.dispositivo}
                    </Text>
                    {sessao.atual && (
                      <Text style={styles.sessionBadge}>ATUAL</Text>
                    )}
                  </View>
                  <Text style={styles.sessionDetalhe}>
                    {sessao.detalhe}
                  </Text>
                </View>
                <Text style={styles.sessionQuando}>{sessao.quando}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Navbar navigation={navigation} activeTab="Config" />
    </SafeAreaView>
  );
}

/* CAMPO REUTILIZÁVEL */
function Campo({ titulo, valor, alterar, senha, bloqueado, tipo }) {
  return (
    <View>
      <Text style={styles.label}>{titulo}</Text>

      <TextInput
        style={[styles.input, bloqueado && styles.disabled]}
        value={valor}
        onChangeText={alterar}
        secureTextEntry={senha}
        editable={!bloqueado}
        placeholder={titulo}
        keyboardType={
          tipo === "email"
            ? "email-address"
            : tipo === "phone"
              ? "phone-pad"
              : "default"
        }
        autoCapitalize={tipo === "email" ? "none" : "sentences"}
        autoCorrect={tipo !== "email"}
        maxLength={tipo === "phone" ? 11 : undefined}
      />
    </View>
  );
}

/* SWITCH REUTILIZÁVEL */
function Opcao({ texto, valor, alterar }) {
  return (
    <View style={styles.option}>
      <Text>{texto}</Text>

      <Switch
        value={valor}
        onValueChange={alterar}
        trackColor={{
          false: "#DDD",
          true: "#FF6B2C",
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },

  content: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 30,
  },

  estado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  estadoTexto: {
    marginTop: 12,
    color: "#555",
    fontSize: 13,
  },

  erroTexto: {
    color: "#B42318",
    fontSize: 13,
    textAlign: "center",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },

  aviso: {
    backgroundColor: "#FFF8E1",
    borderWidth: 1,
    borderColor: "#FFE082",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },

  avisoTexto: {
    color: "#8A6D3B",
    fontSize: 12,
  },

  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },

  section: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },

  avatar: {
    alignSelf: "center",
    backgroundColor: "#DDD",
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  photo: {
    backgroundColor: "#FF6B2C",
    alignSelf: "center",
    padding: 7,
    borderRadius: 6,
    marginVertical: 10,
  },

  removePhoto: {
    alignSelf: "center",
    marginBottom: 6,
  },

  removePhotoText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "600",
  },

  label: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 6,
    padding: 9,
  },

  disabled: {
    backgroundColor: "#EEE",
    color: "#888",
  },

  button: {
    backgroundColor: "#FF6B2C",
    padding: 11,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 15,
  },

  disabledButton: {
    opacity: 0.7,
  },

  white: {
    color: "#FFF",
    fontWeight: "bold",
  },

  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  hint: {
    fontSize: 10,
    color: "#888",
    marginTop: 8,
  },

  campoComIcone: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  flexUm: {
    flex: 1,
  },

  eyeButton: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  session: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },

  sessionTitulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sessionDispositivo: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2024",
  },

  sessionBadge: {
    backgroundColor: "#E7F7EC",
    color: "#1B8A4B",
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },

  sessionDetalhe: {
    fontSize: 10,
    color: "#888",
    marginTop: 2,
  },

  sessionQuando: {
    fontSize: 11,
    color: "#666",
    marginLeft: 8,
  },
});
