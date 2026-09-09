import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
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

export default function Login({ navigation }) {
  const [user, setUser] = useState({ email: "", password : "" });
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const onChange = (name, value) => {
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!user.email || !user.password ) {
      Alert.alert("Atenção", "Preencha o email institucional e a senha.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.postLogin(user);
      await SecureStore.setItemAsync("token", response.data.data.token);

      if (response.data.data.user) {
        await SecureStore.setItemAsync(
          "user",
          JSON.stringify(response.data.data.user),
        );
      }
      navigation.navigate("Dashboard");
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message || "Erro ao conectar ao servidor";
      Alert.alert("Erro", errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
        {/* Badge do App */}
        <View style={styles.logoBadge}>
          <Ionicons name="restaurant" size={16} color={COLORS.orange} />
          <Text style={styles.logoText}>Foodstuff</Text>
        </View>

        <Text style={styles.title}>Seja Bem Vindo!</Text>
        <Text style={styles.subtitle}>
          Entre para gerenciar seus pedidos e mesas
        </Text>

        {/* Card do Form */}
        <View style={styles.card}>
          <Text style={styles.label}>Email institucional</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={18}
              color={COLORS.gray}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="exemplo@foodhub.com"
              placeholderTextColor={COLORS.gray}
              value={user.email}
              onChangeText={(value) => onChange("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={styles.label}>Senha PIN</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={COLORS.gray}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Sua senha de 6 dígitos"
              placeholderTextColor={COLORS.gray}
              value={user.password}
              onChangeText={(value) => onChange("password", value)}
              keyboardType="text"
              secureTextEntry={!showPin}
            />
            <TouchableOpacity onPress={() => setShowPin(!showPin)}>
              <Ionicons
                name={showPin ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={COLORS.gray}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate("EsqueciSenha")}
          >
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 28,
    textAlign: "center",
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: "500",
  },
  button: {
    backgroundColor: COLORS.orange,
    paddingVertical: 14,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
  footer: {
    flexDirection: "row",
    marginTop: 24,
  },
  footerText: {
    color: COLORS.gray,
    fontSize: 13,
  },
  footerLink: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: "700",
  },
});
