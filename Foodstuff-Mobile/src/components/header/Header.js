import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const COLORS = {
  primary: "#FF6B2C",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
};

export default function Header({ navigation }) {
  const [menuAberto, setMenuAberto] = useState(false);

  async function handleLogout() {
    try {
      // Remove o token
      await SecureStore.deleteItemAsync("token");

      // Remove os dados do usuário
      await SecureStore.deleteItemAsync("user");

      console.log("Logout realizado com sucesso");

      // Fecha o menu
      setMenuAberto(false);

      // Volta para a tela de Login
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        {/* LOGO */}
        <View style={styles.headerLeft}>
          <Ionicons
            name="restaurant-outline"
            size={22}
            color={COLORS.primary}
          />

          <Text style={styles.headerTitle}>Foodstuff</Text>
        </View>

        {/* PERFIL */}
        <View style={styles.profileContainer}>
          <TouchableOpacity
            style={styles.avatar}
            activeOpacity={0.7}
            onPress={() => setMenuAberto((prev) => !prev)}
          >
            <Ionicons name="person-outline" size={18} color={COLORS.textDark} />
          </TouchableOpacity>

          {/* DROPDOWN */}
          {menuAberto && (
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={17} color="#EF4444" />

                <Text style={styles.dropdownLogout}>Sair</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.card,
  },

  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
    marginLeft: 10,
  },

  profileContainer: {
    position: "relative",
    zIndex: 100,
  },

  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdown: {
    position: "absolute",
    top: 40,
    right: 0,
    width: 110,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 8,

    elevation: 8,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,

    zIndex: 999,
  },

  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },

  dropdownLogout: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
  },
});
