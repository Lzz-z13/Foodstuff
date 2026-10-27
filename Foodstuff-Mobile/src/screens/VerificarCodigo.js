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

const COLORS = {
  background: "#F5F6F8",
  card: "#FFFFFF",
  dark: "#1C1C1E",
  orange: "#F2622E",
  gray: "#8E8E93",
  lightGray: "#E5E5EA",
  text: "#1C1C1E",
};

function formatCodigo(text) {
  const digits = text.replace(/\D/g, "").slice(0, 6);
  return digits.replace(/(\d{2})(?=\d)/g, "$1.");
}

export default function VerificarCodigoGarcom({ navigation, route }) {
  const email = route?.params?.email;
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConferir() {
    if (!email) {
      Alert.alert("Atenção", "Email não informado para a recuperação de senha.");
      return;
    }

    const digits = codigo.replace(/\D/g, "");
    if (digits.length !== 6) {
      Alert.alert("Atenção", "Digite o código de 6 dígitos.");
      return;
    }

    try {
      setLoading(true);
      navigation?.navigate?.("NovaSenhaGarcom", { email, codigo: digits });
    } catch (error) {
      Alert.alert("Erro", "Código inválido ou expirado.");
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

        <Text style={styles.title}>Redefinir senha</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Digite o código</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={COLORS.gray}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="00.00.00"
              placeholderTextColor={COLORS.gray}
              value={codigo}
              onChangeText={(value) => setCodigo(formatCodigo(value))}
              keyboardType="number-pad"
              maxLength={8}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleConferir}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Conferir código</Text>
            )}
          </TouchableOpacity>
        </View>
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
    marginTop: 24,
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