import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TABS = [
  { key: "Mesas", icon: "grid-outline", route: "Mesas" },
  { key: "Pedidos", icon: "receipt-outline", route: "Garcom" },
  { key: "Perfil", icon: "person-circle-outline", route: "PerfilGarcom" },
];

export default function NavbarGarcom({ navigation, activeTab = "Pedidos" }) {
  const insets = useSafeAreaInsets();

  const handlePress = (route) => {
    if (!navigation || !route) return;
    navigation.navigate(route);
  };

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
      {TABS.map(({ key, icon, route }) => {
        const isActive = activeTab === key;

        return (
          <TouchableOpacity
            key={key}
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => handlePress(route)}
          >
            <Ionicons
              name={icon}
              size={28}
              color={isActive ? "#FF5A36" : "#6B7280"}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? "#FF5A36" : "#6B7280" },
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
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    elevation: 6,
  },

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
  },

  tabLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
});
