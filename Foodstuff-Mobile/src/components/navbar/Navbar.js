import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

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
};

export default function Navbar({ navigation, activeTab = "Dashboard" }) {
  const insets = useSafeAreaInsets();

  function handleTabPress(tab) {
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
    <SafeAreaView>
      <View
        style={[
          styles.bottomNav,
          {
            paddingBottom: 1,
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
  bottomNav: {
    position: "flex",
    bottom: -540,
    left: -14,
    right: 0,

    width:380,

    minHeight: 68,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: COLORS.card,

    borderTopWidth: 1,
    borderTopColor: COLORS.border,

    elevation: 10,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
