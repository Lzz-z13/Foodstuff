import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";

const COLORS = {
  background: "#F5F6F8",
  card: "#FFFFFF",
  dark: "#1C1C1E",
  orange: "#F2622E",
  gray: "#8E8E93",
  lightGray: "#E5E5EA",
  text: "#1C1C1E",
};

export default function NovaSenha({ navigation, route }) {
  const { email, resetToken, otp, flow } = route?.params || {};
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleRedefinir() {
    // Precisa do e-mail e de ao menos uma credencial: token ou código OTP
    if (!email || (!resetToken && !otp)) {
      Alert.alert(
        "Atenção",
        "Dados da recuperação não encontrados. Solicite um novo código e tente novamente."
      );
      return;
    }

    if (senha.length < 8) {
      Alert.alert("Atenção", "A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    if (senha !== confirmar) {
      Alert.alert("Atenção", "As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        email,
        new_password: senha,
        confirm_password: confirmar,
      };
      if (resetToken) payload.resetToken = resetToken;
      if (otp) payload.otp = otp;

      await api.confirmPasswordReset(payload);

      Alert.alert("Pronto!", "Senha redefinida com sucesso.", [
        {
          text: "OK",
          onPress: () =>
            navigation?.reset?.({
              index: 0,
              routes: [{ name: "Login" }],
            }),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Erro",
        error?.response?.data?.message || "Não foi possível redefinir a senha."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoBadge}>
          <Ionicons name="restaurant" size={16} color={COLORS.orange} />
          <Text style={styles.logoText}>Foodstuff</Text>
        </View>

        <Text style={styles.title}>Redefinir a Senha</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Digite sua nova senha</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={COLORS.gray}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Digite sua nova senha"
              placeholderTextColor={COLORS.gray}
              value={senha}
              onChangeText={setSenha}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={COLORS.gray}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirme sua senha</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={COLORS.gray}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirme sua senha"
              placeholderTextColor={COLORS.gray}
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((prev) => !prev)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={COLORS.gray}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRedefinir}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Redefinir senha</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  logoText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 28,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 46,
    color: COLORS.text,
    fontSize: 14,
  },
  button: {
    backgroundColor: COLORS.orange,
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});