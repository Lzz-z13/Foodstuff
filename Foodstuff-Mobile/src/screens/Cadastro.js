import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../axios/axios";

const LISTA_CARGOS = [
  "Chef de Cozinha",
  "Garçom",
  "Gerente",
];

export default function Cadastro() {
  const [user, setUser] = useState({
    nome: "",
    email: "",
    cargo: LISTA_CARGOS[0],
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const { nome, email, cargo } = user;

  const handleChange = (field, value) => {
    setUser((prev) => ({ ...prev, [field]: value }));
  };

  const validarFormulario = () => {
    if (!nome.trim()) {
      Alert.alert("Campo obrigatório", "Por favor, informe seu nome completo.");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("E-mail inválido", "Insira um endereço de e-mail válido.");
      return false;
    }
    return true;
  };

  const handleCadastro = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const response = await api.postUser({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cargo,
      });

      Alert.alert("Sucesso!", response.data.message || "Conta criada com sucesso.");
      
      // Limpa os campos após o cadastro com sucesso
      setUser({
        nome: "",
        email: "",
        cargo: LISTA_CARGOS[0],
      });
    } catch (error) {
      const mensagemErro =
        error.response?.data?.error || "Não foi possível realizar o cadastro. Tente novamente.";
      Alert.alert("Ops!", mensagemErro);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabeçalho */}
        <View style={styles.logoBadge}>
          <Ionicons name="restaurant" size={16} color="#fff" />
          <Text style={styles.logoText}>Foodstuff</Text>
        </View>

        <Text style={styles.title}>Criar sua conta</Text>

        {/* Card do Formulário */}
        <View style={styles.card}>
          {/* Nome */}
          <Text style={styles.label}>Nome completo</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={18}
              color="#9CA3AF"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Ex: Maria Silva"
              placeholderTextColor="#9CA3AF"
              value={nome}
              onChangeText={(value) => handleChange("nome", value)}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={18}
              color="#9CA3AF"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="seuemail@foodhub.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(value) => handleChange("email", value)}
            />
          </View>

          {/* Dropdown de Cargo */}
          <Text style={styles.label}>Cargo na equipe</Text>
          <TouchableOpacity
            style={styles.inputWrapper}
            activeOpacity={0.7}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons
              name="briefcase-outline"
              size={18}
              color="#9CA3AF"
              style={styles.inputIcon}
            />
            <Text style={styles.dropdownValue}>{cargo}</Text>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Botão de Envio */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCadastro}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Criar conta</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Dropdown */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o seu Cargo</Text>
            {LISTA_CARGOS.map((item) => {
              const isSelected = cargo === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    handleChange("cargo", item);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      isSelected && styles.modalItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color="#FF5A36" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  logoText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A1A",
    marginBottom: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: "100%",
    color: "#111827",
    fontSize: 14,
  },
  dropdownValue: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#FF5A36",
    borderRadius: 10,
    height: 48,
    justifycontent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modalItemSelected: {
    backgroundColor: "#FFF0ED",
  },
  modalItemText: {
    fontSize: 14,
    color: "#374151",
  },
  modalItemTextSelected: {
    fontWeight: "bold",
    color: "#FF5A36",
  },
});