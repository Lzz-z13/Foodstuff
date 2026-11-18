import React, { useCallback, useEffect, useState } from "react";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import api from "../../services/api";
import LogoutButton from "../../components/header/LogoutButton";
import NavbarGarcom from "../../components/navbar/NavbarGarcom";

const LARANJA = "#FF6B2C";
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

export default function PerfilGarcom({ navigation }) {
  const [perfil, setPerfil] = useState({
    name: "",
    phone: "",
    email: "",
    role: "",
  });
  const [perfilInicial, setPerfilInicial] = useState(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [erroPerfil, setErroPerfil] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarNova, setMostrarNova] = useState(false);
  const [editandoSenha, setEditandoSenha] = useState(false);

  const carregarPerfil = useCallback(async () => {
    setCarregandoPerfil(true);
    setErroPerfil("");
    try {
      const response = await api.getCurrentUser();
      const user = response.data?.data;
      if (!user) {
        throw new Error("A API não retornou os dados do perfil.");
      }

      const dados = {
        name: user.name || "",
        phone: String(user.phone || ""),
        email: user.email || "",
        role: user.role || "",
        photo: user.photo || "",
      };
      setPerfil(dados);
      setPerfilInicial(dados);
    } catch (error) {
      setErroPerfil(
        error?.response?.data?.message ||
          error.message ||
          "Não foi possível carregar seu perfil.",
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
        const userCache = await SecureStore.getItemAsync("user");
        const dadosCache = userCache ? JSON.parse(userCache) : {};
        await SecureStore.setItemAsync(
          "user",
          JSON.stringify({ ...dadosCache, photo: fotoSalva }),
        );
      } catch {
        // ignora falha local para não bloquear a atualização do servidor
      }

      DeviceEventEmitter.emit("userPhotoUpdated", fotoSalva || null);

      Alert.alert(
        "Sucesso",
        fotoSalva
          ? "Foto atualizada com sucesso!"
          : "Foto removida com sucesso!",
      );
    } catch (error) {
      Alert.alert(
        "Erro",
        error?.response?.data?.message || "Não foi possível atualizar a foto.",
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
        Alert.alert("Imagem muito grande", "Escolha uma imagem de até 5 MB.");
        return;
      }

      await salvarFotoNoServidor(`data:${mime};base64,${asset.base64}`);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível abrir a galeria de fotos.");
    }
  };

  const removerFoto = () => {
    if (!perfil?.photo || salvando) return;

    Alert.alert("Remover foto", "Deseja remover sua foto de perfil?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
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

  async function salvar(secao) {
    if (salvando || !perfilInicial) return;
    const name = perfil.name.trim();
    const email = perfil.email.trim().toLowerCase();
    const phone = perfil.phone.replace(/\D/g, "");
    const alterouPerfil =
      secao === "perfil" &&
      (name !== perfilInicial.name ||
        email !== perfilInicial.email ||
        phone !== perfilInicial.phone.replace(/\D/g, ""));
    const informouSenha = secao === "senha";

    if (secao === "perfil" && (!name || !email || !phone)) {
      Alert.alert("Atenção", "Preencha nome, telefone e e-mail.");
      return;
    }
    if (secao === "perfil" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Atenção", "Informe um e-mail válido.");
      return;
    }
    if (secao === "perfil" && !/^\d{11}$/.test(phone)) {
      Alert.alert("Atenção", "O telefone deve conter DDD e 11 dígitos.");
      return;
    }
    if (informouSenha) {
      if (!senhaAtual || !novaSenha || !confirmarSenha) {
        Alert.alert("Atenção", "Preencha os três campos de senha.");
        return;
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(novaSenha)) {
        Alert.alert(
          "Atenção",
          "A nova senha precisa ter ao menos 8 caracteres, uma letra maiúscula, uma minúscula e um caractere especial.",
        );
        return;
      }
      if (novaSenha !== confirmarSenha) {
        Alert.alert("Atenção", "As senhas não coincidem.");
        return;
      }
    }
    if (!alterouPerfil && !informouSenha) {
      Alert.alert("Atenção", "Nenhuma alteração foi feita.");
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
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
        setEditandoSenha(false);
        setMostrarNova(false);

        const token = response.data?.token;
        if (!token) {
          throw new Error("A API não retornou o novo token de acesso.");
        }
        await SecureStore.setItemAsync("token", token);

        try {
          const userCache = await SecureStore.getItemAsync("user");
          if (userCache) {
            await SecureStore.setItemAsync(
              "user",
              JSON.stringify({ ...JSON.parse(userCache), first_login: 0 }),
            );
          }
        } catch {
          avisos.push(
            "Não foi possível atualizar os dados salvos neste aparelho.",
          );
        }
      }

      if (alterouPerfil) {
        await api.patchUserCredentials({ name, email, phone });
        perfilSalvo = true;
        const dadosAtualizados = { ...perfil, name, email, phone };
        setPerfil(dadosAtualizados);
        setPerfilInicial(dadosAtualizados);

        try {
          const userCache = await SecureStore.getItemAsync("user");
          const dadosCache = userCache ? JSON.parse(userCache) : perfilInicial;
          await SecureStore.setItemAsync(
            "user",
            JSON.stringify({ ...dadosCache, ...dadosAtualizados }),
          );
        } catch {
          avisos.push(
            "Não foi possível atualizar os dados salvos neste aparelho.",
          );
        }
      }

      Alert.alert(
        avisos.length ? "Atenção" : "Sucesso",
        avisos.length ? avisos.join("\n") : "Alterações salvas com sucesso.",
      );
    } catch (error) {
      const mensagem =
        error?.response?.data?.message ||
        error.message ||
        "Não foi possível salvar as alterações.";
      Alert.alert(
        perfilSalvo || senhaSalva ? "Atualização parcial" : "Erro",
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
      MANAGER: "Gerente",
      WAITER: "Garçom",
      KITCHEN: "Cozinha",
      CASHIER: "Caixa",
    }[perfil.role] || perfil.role;

  const dadosAlterados =
    perfilInicial &&
    (perfil.name.trim() !== perfilInicial.name ||
      perfil.email.trim().toLowerCase() !== perfilInicial.email ||
      perfil.phone !== perfilInicial.phone);
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={cancelar}
          style={styles.voltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          disabled={salvando}
        >
          <Ionicons name="arrow-back" size={22} color="#1F2024" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo}>Meu perfil</Text>
          <Text style={styles.headerSub}>Suas informações e acesso</Text>
        </View>
        <LogoutButton navigation={navigation} />
      </View>
      {carregandoPerfil ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color={LARANJA} />
          <Text style={styles.estadoTexto}>Carregando perfil...</Text>
        </View>
      ) : erroPerfil ? (
        <View style={styles.estado}>
          <Text style={styles.erroTexto}>{erroPerfil}</Text>
          <TouchableOpacity style={styles.botaoSalvar} onPress={carregarPerfil}>
            <Text style={styles.botaoSalvarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.conteudo}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.profileCard}>
              <View style={styles.identityRow}>
                <View style={styles.avatarWrap}>
                  {perfil.photo ? (
                    <Image
                      source={{ uri: perfil.photo }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Ionicons name="person-outline" size={35} color={LARANJA} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.identityName}>
                    {perfilInicial?.name || "Seu perfil"}
                  </Text>
                  <View style={styles.roleBadge}>
                    <Ionicons
                      name="restaurant-outline"
                      size={13}
                      color="#B4471B"
                    />
                    <Text style={styles.roleText}>{cargo}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.avatarActions}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={alterarFoto}
                  disabled={salvando}
                >
                  <Ionicons name="camera-outline" size={18} color={LARANJA} />
                  <Text style={styles.photoButtonText}>
                    {perfil.photo ? "Alterar foto" : "Adicionar foto"}
                  </Text>
                </TouchableOpacity>
                {perfil.photo && (
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={removerFoto}
                    disabled={salvando}
                  >
                    <Ionicons name="trash-outline" size={17} color="#DC2626" />
                    <Text style={styles.removeText}>Remover foto</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeading}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="person-outline" size={20} color={LARANJA} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.secao}>Dados pessoais</Text>
                  <Text style={styles.sectionHint}>
                    Mantenha seus dados de contato atualizados.
                  </Text>
                </View>
              </View>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                accessibilityLabel="Nome completo"
                style={styles.input}
                value={perfil.name}
                onChangeText={(name) =>
                  setPerfil((atual) => ({ ...atual, name }))
                }
                autoCapitalize="words"
                maxLength={100}
                editable={!salvando}
                autoComplete="name"
              />
              <Text style={styles.label}>Telefone com DDD</Text>
              <TextInput
                accessibilityLabel="Telefone com DDD"
                style={styles.input}
                value={perfil.phone}
                onChangeText={(phone) =>
                  setPerfil((atual) => ({
                    ...atual,
                    phone: phone.replace(/\D/g, ""),
                  }))
                }
                keyboardType="phone-pad"
                maxLength={11}
                editable={!salvando}
                autoComplete="tel"
              />
              <Text style={styles.fieldHint}>11 dígitos, incluindo o DDD.</Text>
              <Text style={styles.label}>E-mail de acesso</Text>
              <TextInput
                accessibilityLabel="E-mail de acesso"
                style={styles.input}
                value={perfil.email}
                onChangeText={(email) =>
                  setPerfil((atual) => ({ ...atual, email }))
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!salvando}
                autoComplete="email"
              />
              <Text style={styles.fieldHint}>
                Use este e-mail para entrar no aplicativo.
              </Text>
              <View style={styles.readOnlyRole}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={17}
                  color="#8B8D98"
                />
                <Text style={styles.fieldHint}>
                  Função: {cargo}. Alterações de cargo são feitas pelo
                  administrador.
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.botaoSalvar,
                  (!dadosAlterados || salvando) && styles.botaoDesabilitado,
                ]}
                disabled={!dadosAlterados || salvando}
                onPress={() => salvar("perfil")}
              >
                <Text style={styles.botaoSalvarTexto}>
                  {salvando ? "Salvando..." : "Salvar dados pessoais"}
                </Text>
              </TouchableOpacity>
              {!!dadosAlterados && (
                <TouchableOpacity
                  style={styles.discardButton}
                  disabled={salvando}
                  onPress={() => setPerfil({ ...perfilInicial })}
                >
                  <Text style={styles.discardText}>
                    Descartar alterações dos dados
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeading}
                disabled={salvando}
                onPress={() => setEditandoSenha((value) => !value)}
                accessibilityRole="button"
                accessibilityState={{ expanded: editandoSenha }}
              >
                <View style={styles.sectionIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={LARANJA}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.secao}>Segurança</Text>
                  <Text style={styles.sectionHint}>
                    Alterar sua senha de acesso.
                  </Text>
                </View>
                <Ionicons
                  name={editandoSenha ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#8B8D98"
                />
              </TouchableOpacity>
              {editandoSenha && (
                <>
                  <Text style={styles.label}>Senha atual</Text>
                  <TextInput
                    accessibilityLabel="Senha atual"
                    style={styles.input}
                    value={senhaAtual}
                    onChangeText={setSenhaAtual}
                    placeholder="Digite sua senha atual"
                    placeholderTextColor="#8B8D98"
                    secureTextEntry={!mostrarNova}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!salvando}
                    autoComplete="current-password"
                  />
                  <Text style={styles.label}>Nova senha</Text>
                  <TextInput
                    accessibilityLabel="Nova senha"
                    style={styles.input}
                    value={novaSenha}
                    onChangeText={setNovaSenha}
                    placeholder="Crie uma nova senha"
                    placeholderTextColor="#8B8D98"
                    secureTextEntry={!mostrarNova}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!salvando}
                    autoComplete="new-password"
                  />
                  <Text style={styles.fieldHint}>
                    No mínimo 8 caracteres, com maiúscula, minúscula e símbolo.
                  </Text>
                  <Text style={styles.label}>Confirmar nova senha</Text>
                  <TextInput
                    accessibilityLabel="Confirmar nova senha"
                    style={styles.input}
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                    placeholder="Repita a nova senha"
                    placeholderTextColor="#8B8D98"
                    secureTextEntry={!mostrarNova}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!salvando}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    style={styles.showPassword}
                    onPress={() => setMostrarNova((v) => !v)}
                    accessibilityLabel={
                      mostrarNova ? "Ocultar senhas" : "Mostrar senhas"
                    }
                  >
                    <Ionicons
                      name={mostrarNova ? "eye-off-outline" : "eye-outline"}
                      size={19}
                      color="#70737E"
                    />
                    <Text style={styles.sectionHint}>
                      {mostrarNova ? "Ocultar senhas" : "Mostrar senhas"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.botaoSalvar,
                      salvando && styles.botaoDesabilitado,
                    ]}
                    disabled={salvando}
                    onPress={() => salvar("senha")}
                  >
                    <Text style={styles.botaoSalvarTexto}>
                      {salvando ? "Salvando..." : "Atualizar senha"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      <NavbarGarcom navigation={navigation} activeTab="Perfil" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDF0",
  },
  headerTitulo: { fontSize: 20, fontWeight: "800", color: "#1F2024" },
  headerSub: { fontSize: 11, color: "#8B8D98", marginTop: 3 },
  voltar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F5F6F8",
    alignItems: "center",
    justifyContent: "center",
  },
  estado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  estadoTexto: { color: "#70737E", fontSize: 14 },
  erroTexto: { color: "#B42318", fontSize: 14, textAlign: "center" },
  conteudo: { padding: 18, paddingBottom: 32, gap: 16 },
  profileCard: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECEDF0",
  },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  identityName: { fontSize: 19, fontWeight: "800", color: "#1F2024" },
  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: "#FFF1EA",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  roleBadge: {
    flexDirection: "row",
    gap: 5,
    alignSelf: "flex-start",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: "#FFF1EA",
  },
  roleText: { color: "#B4471B", fontSize: 11, fontWeight: "700" },
  avatarActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#ECEDF0",
    paddingTop: 8,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
  },
  photoButtonText: { color: LARANJA, fontSize: 12, fontWeight: "700" },
  removeText: { color: "#DC2626", fontSize: 12, fontWeight: "600" },
  sectionCard: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECEDF0",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 44,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFF1EA",
  },
  secao: { fontSize: 16, fontWeight: "700", color: "#1F2024" },
  sectionHint: { fontSize: 11, color: "#70737E", lineHeight: 17, marginTop: 3 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555963",
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#E3E5EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F2024",
    backgroundColor: "#FAFBFC",
  },
  fieldHint: {
    color: "#8B8D98",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
    flexShrink: 1,
  },
  readOnlyRole: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  botaoSalvar: {
    backgroundColor: LARANJA,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  botaoSalvarTexto: { fontSize: 13, color: "#FFFFFF", fontWeight: "700" },
  botaoDesabilitado: { opacity: 0.45 },
  discardButton: { alignItems: "center", paddingVertical: 14, marginTop: 4 },
  discardText: { color: "#70737E", fontSize: 12 },
  showPassword: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    marginTop: 10,
  },
});
