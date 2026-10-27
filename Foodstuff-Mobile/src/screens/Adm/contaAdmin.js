import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import Header from "../../components/header/Header";
import Navbar from "../../components/navbar/Navbar";
import api from "../../services/api";

export default function ContaAdmin({ navigation }) {
  // DADOS DO USUÁRIO
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  // SENHA
  const [senha, setSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  // NOTIFICAÇÕES
  const [emailNotif, setEmailNotif] = useState(true);
  const [push, setPush] = useState(true);
  const [criticos, setCriticos] = useState(false);

  // CARREGAR USUÁRIO
  useEffect(() => {
    carregarUsuario();
  }, []);

  const carregarUsuario = async () => {
    try {
      const response = await api.getUser();
      const usuario = response.data?.data ?? JSON.parse(await SecureStore.getItemAsync("user") ?? "{}");

      setNome(usuario.name || "");
      setEmail(usuario.email || "");
      setTelefone(usuario.phone || "");

      await SecureStore.setItemAsync(
        "user",
        JSON.stringify(usuario)
      );
    } catch (error) {
      console.log("Erro ao carregar usuário:", error);

      Alert.alert(
        "Erro",
        "Não foi possível carregar seus dados."
      );
    }
  };

  // SALVAR DADOS
  const salvar = async () => {
    if (!nome || !email || !telefone) {
      Alert.alert(
        "Atenção",
        "Preencha todos os campos."
      );
      return;
    }

    try {
      const response = await api.updateUser({
        name: nome,
        email: email,
        phone: telefone,
      });

      const usuarioAtualizado = response.data?.data ?? {
        name: nome,
        email: email,
        phone: telefone,
      };

      await SecureStore.setItemAsync(
        "user",
        JSON.stringify(usuarioAtualizado)
      );

      Alert.alert(
        "Sucesso",
        "Dados atualizados com sucesso!"
      );
    } catch (error) {
      console.log("Erro ao atualizar:", error);

      Alert.alert(
        "Erro",
        error.response?.data?.message ||
          "Não foi possível atualizar seus dados."
      );
    }
  };

  // ALTERAR SENHA
  const alterarSenha = async () => {
    if (!senha || !novaSenha || !confirmar) {
      Alert.alert(
        "Atenção",
        "Preencha todos os campos de senha."
      );
      return;
    }

    if (novaSenha !== confirmar) {
      Alert.alert(
        "Erro",
        "As novas senhas não são iguais."
      );
      return;
    }

    try {
      await api.updatePassword({
        current_password: senha,
        new_password: novaSenha,
      });

      Alert.alert(
        "Sucesso",
        "Senha alterada com sucesso!"
      );

      setSenha("");
      setNovaSenha("");
      setConfirmar("");
    } catch (error) {
      console.log("Erro ao alterar senha:", error);

      Alert.alert(
        "Erro",
        error.response?.data?.message ||
          "Não foi possível alterar a senha."
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header navigation={navigation} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.container}
      >
        <Text style={styles.title}>Configurações</Text>

        {/* MINHA CONTA */}
        <View style={styles.card}>
          <Text style={styles.section}>Minha Conta</Text>

          <View style={styles.avatar}>
            <Ionicons
              name="person"
              size={35}
              color="#888"
            />
          </View>

          <TouchableOpacity
            style={styles.photo}
            onPress={() =>
              Alert.alert(
                "Foto",
                "Alteração de foto ainda não disponível."
              )
            }
          >
            <Text style={styles.white}>Alterar Foto</Text>
          </TouchableOpacity>

          <Campo
            titulo="Nome Completo"
            valor={nome}
            alterar={setNome}
          />

          <Campo
            titulo="E-mail Corporativo"
            valor={email}
            alterar={setEmail}
          />

          <Campo
            titulo="Telefone"
            valor={telefone}
            alterar={setTelefone}
          />

          <Campo
            titulo="Cargo / Função"
            valor="Administrador Geral"
            bloqueado
          />

          <TouchableOpacity
            style={styles.button}
            onPress={salvar}
          >
            <Text style={styles.white}>
              Salvar Alterações
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEGURANÇA */}
        <View style={styles.card}>
          <Text style={styles.section}>
            Segurança
          </Text>

          <Campo
            titulo="Senha Atual"
            valor={senha}
            alterar={setSenha}
            senha
          />

          <Campo
            titulo="Nova Senha"
            valor={novaSenha}
            alterar={setNovaSenha}
            senha
          />

          <Campo
            titulo="Confirmar Nova Senha"
            valor={confirmar}
            alterar={setConfirmar}
            senha
          />

          <TouchableOpacity
            style={styles.button}
            onPress={alterarSenha}
          >
            <Text style={styles.white}>
              Alterar Senha
            </Text>
          </TouchableOpacity>
        </View>

        {/* NOTIFICAÇÕES */}
        <View style={styles.card}>
          <Text style={styles.section}>
            Preferências de Notificação
          </Text>

          <Opcao
            texto="Notificações por E-mail"
            valor={emailNotif}
            alterar={setEmailNotif}
          />

          <Opcao
            texto="Alertas Push"
            valor={push}
            alterar={setPush}
          />

          <Opcao
            texto="Alertas Críticos"
            valor={criticos}
            alterar={setCriticos}
          />
        </View>

        {/* SESSÕES */}
        <View style={styles.card}>
          <Text style={styles.section}>
            Sessões Ativas
          </Text>

          <Text style={styles.session}>
            📱 iPhone — Agora
          </Text>

          <Text style={styles.session}>
            💻 Chrome — Ontem às 16:34
          </Text>

          <Text style={styles.session}>
            🖥️ Firefox — 17/09/2026
          </Text>
        </View>
      </ScrollView>

      <Navbar
        navigation={navigation}
        activeTab="Config"
      />
    </SafeAreaView>
  );
}

/* CAMPO REUTILIZÁVEL */
function Campo({
  titulo,
  valor,
  alterar,
  senha,
  bloqueado,
}) {
  return (
    <View>
      <Text style={styles.label}>{titulo}</Text>

      <TextInput
        style={[
          styles.input,
          bloqueado && styles.disabled,
        ]}
        value={valor}
        onChangeText={alterar}
        secureTextEntry={senha}
        editable={!bloqueado}
        placeholder={titulo}
      />
    </View>
  );
}

/* SWITCH REUTILIZÁVEL */
function Opcao({
  texto,
  valor,
  alterar,
}) {
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

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
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
  },

  photo: {
    backgroundColor: "#FF6B2C",
    alignSelf: "center",
    padding: 7,
    borderRadius: 6,
    marginVertical: 10,
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

  session: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
});