import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const COLORS = {
  primary: "#FF6B2C",
  card: "#FFFFFF",
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
  "Cardápio": "Cardapio",
  Config: "contaAdmin",
};

export default function Navbar({
  navigation,
  activeTab,
}) {
  const insets = useSafeAreaInsets();

  function handleTabPress(tab) {
    if (ROUTES[tab]) {
      navigation.navigate(ROUTES[tab]);
    }
  }

  function renderIcon(icon, lib, color) {
    if (lib === "mci") {
      return (
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={color}
        />
      );
    }

    return (
      <Ionicons
        name={icon}
        size={22}
        color={color}
      />
    );
  }

  return (
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

        const color = active
          ? COLORS.primary
          : COLORS.textGray;

        return (
          <TouchableOpacity
            key={key}
            style={styles.tabItem}
            activeOpacity={0.7}
            onPress={() => handleTabPress(key)}
          >
            <View style={styles.icon}>
              {renderIcon(icon, lib, color)}
            </View>

            <Text
              style={[
                styles.tabLabel,
                { color },
              ]}
            >
              {key}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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