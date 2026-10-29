import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

export default function LogoutButton({ navigation, style }) {
  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja encerrar a sessão atual?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync("token");
            await SecureStore.deleteItemAsync("user");

            if (navigation?.reset) {
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              });
            }
          } catch (error) {
            console.log("Erro ao sair da conta:", error);
            Alert.alert("Erro", "Não foi possível sair da conta.");
          }
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      activeOpacity={0.85}
      onPress={handleLogout}
    >
      <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>Sair</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
