import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

import Header from "../components/header/Header";
import Navbar from "../components/navbar/Navbar";

const COLORS = {
  primary: "#FF6B2C",
  background: "#F5F6F8",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
};

export default function Dashboard({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function carregarUsuario() {
      try {
        const dados = await SecureStore.getItemAsync("user");

        if (dados) {
          setUser(JSON.parse(dados));
        }
      } catch (error) {
        console.log("Erro ao carregar usuário:", error);
      }
    }

    carregarUsuario();
  }, []);

  const userName = user?.name || "Usuário";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* HEADER */}
      <Header navigation={navigation} />

      {/* CONTEÚDO */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingTitle}>Bom dia, {userName}</Text>

            <Text style={styles.greetingSubtitle}>Desempenho hoje.</Text>
          </View>

          <TouchableOpacity style={styles.calendarButton}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={COLORS.textDark}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FOOTER */}
      <Navbar navigation={navigation} activeTab="Dashboard" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    padding: 16,
    paddingTop: 20,
  },

  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  greetingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textDark,
  },

  greetingSubtitle: {
    fontSize: 13,
    color: COLORS.textGray,
    marginTop: 2,
  },

  calendarButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
