import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COR_PRIMARIA = "#FF6B2C";

export default function NotificacaoMesa({
  notificacao,
  onClose,
  duracao = 6000,
  style,
}) {
  const animacao = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!notificacao) {
      return undefined;
    }

    animacao.setValue(0);

    Animated.spring(animacao, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 6,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(animacao, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          onClose?.();
        }
      });
    }, duracao);

    return () => clearTimeout(timer);
  }, [notificacao, duracao, onClose, animacao]);

  if (!notificacao) {
    return null;
  }

  const total = notificacao.total || 1;

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: animacao,
          transform: [
            {
              translateY: animacao.interpolate({
                inputRange: [0, 1],
                outputRange: [-24, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.iconBox}>
        <Ionicons name="notifications" size={20} color="#FFFFFF" />
      </View>

      <View style={styles.textBox}>
        <Text style={styles.title}>Nova comanda aberta</Text>
        <Text style={styles.message} numberOfLines={2}>
          {total > 1
            ? `Mesa ${notificacao.mesa} e mais ${total - 1} mesa(s) acabaram de receber clientes.`
            : `Mesa ${notificacao.mesa} • ${
                notificacao.cliente || "Cliente"
              } acabou de entrar.`}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: COR_PRIMARIA,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    zIndex: 999,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
  },
  textBox: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  message: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 2,
    opacity: 0.95,
  },
  closeButton: {
    padding: 4,
  },
});
