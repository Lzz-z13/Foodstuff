import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";

const USER_PHOTO_UPDATED = "userPhotoUpdated";

const COLORS = {
  primary: "#FF6B2C",
  card: "#FFFFFF",
  textDark: "#1F2024",
  border: "#ECEDF0",
};

export default function Header({ navigation }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    let ativo = true;

    async function carregarFoto() {
      try {
        const storedUser = await SecureStore.getItemAsync("user");
        const user = storedUser ? JSON.parse(storedUser) : null;

        if (ativo) {
          setPhoto(user?.photo || null);
        }
      } catch (error) {
        console.log("Erro ao carregar foto do header:", error);
      }
    }

    carregarFoto();

    const subscription = DeviceEventEmitter.addListener(
      USER_PHOTO_UPDATED,
      (novaFoto) => setPhoto(novaFoto || null),
    );

    return () => {
      ativo = false;
      subscription.remove();
    };
  }, []);

  async function handleLogout() {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");

    setMenuAberto(false);
    navigation.replace("Login");
  }

  return (
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
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="person-outline"
              size={18}
              color={COLORS.textDark}
            />
          )}
        </TouchableOpacity>

        {menuAberto && (
          <View style={styles.dropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons
                name="log-out-outline"
                size={17}
                color="#EF4444"
              />

              <Text style={styles.dropdownLogout}>
                Sair
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
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
});