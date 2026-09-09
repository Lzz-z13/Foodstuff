import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const COLORS = {
  primary: "#FF6B2C",
  background: "#F5F6F8",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
};

const TABS = [
  ["Dashboard", "grid-outline", "ion"],
  ["Pedidos", "receipt-outline", "ion"],
  ["Cardápio", "book-outline", "ion"],
  ["Mesas", "table-furniture", "mci"],
  ["Users", "account-outline", "mci"],
  ["Config", "settings-outline", "ion"],
];

const ROUTES = {
  Dashboard: "Dashboard",
  Users: "Cadastro",
};

export default function Dashboard({ navigation }) {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);

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

  async function handleLogout() {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");

    setMenuAberto(false);
    navigation.replace("Login");
  }

  function handleTabPress(tab) {
    setActiveTab(tab);

    if (ROUTES[tab]) {
      navigation.navigate(ROUTES[tab]);
    }
  }

  function renderIcon(icon, lib, color) {
    if (lib === "mci") {
      return <MaterialCommunityIcons name={icon} size={22} color={color} />;
    }

    return <Ionicons name={icon} size={22} color={color} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="restaurant-outline"
            size={22}
            color={COLORS.primary}
          />

          <Text style={styles.headerTitle}>Foodstuff</Text>
        </View>

        <View style={styles.profileContainer}>
          <TouchableOpacity
            style={styles.avatar}
            activeOpacity={0.7}
            onPress={() => setMenuAberto(!menuAberto)}
          >
            <Ionicons name="person-outline" size={18} color={COLORS.textDark} />
          </TouchableOpacity>

          {menuAberto && (
            <View style={styles.dropdown}>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={17} color="#EF4444" />

                <Text style={styles.dropdownLogout}>Sair</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

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
      <View
        style={[
          styles.bottomNav,
          {
            height: 68 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {TABS.map(([key, icon, lib]) => {
          const active = activeTab === key;
          const color = active ? COLORS.primary : COLORS.textGray;

          return (
            <TouchableOpacity
              key={key}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => handleTabPress(key)}
            >
              <View style={styles.icon}>{renderIcon(icon, lib, color)}</View>

              <Text style={[styles.tabLabel, { color }]}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    width: 170,
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
    zIndex: 100,
  },

  dropdownName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },

  dropdownLogout: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "600",
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

  bottomNav: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 8,
  },

  tabItem: {
    flex: 1,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    width: 28,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
});
