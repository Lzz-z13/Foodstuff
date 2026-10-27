import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  primary: "#FF6B2C",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
};

const STATUS = {
  Concluído: {
    color: "#16A34A",
    background: "#EAF8EF",
  },

  Preparando: {
    color: "#D97706",
    background: "#FFF5E5",
  },

  Aguardando: {
    color: "#2563EB",
    background: "#EDF4FF",
  },
};

export default function RecentOrders({ orders }) {

  return (
    <View style={styles.card}>

      <View style={styles.header}>

        <Text style={styles.title}>
          Pedidos Recentes
        </Text>

        <Ionicons
          name="arrow-forward"
          size={16}
          color={COLORS.textGray}
        />

      </View>

      {orders.map((order, index) => {

        const status =
          STATUS[order.status] ||
          STATUS.Aguardando;

        return (
          <View
            key={order.id}
            style={[
              styles.order,
              index === orders.length - 1 &&
                styles.lastOrder,
            ]}
          >

            <View style={styles.orderIcon}>
              <Ionicons
                name="receipt-outline"
                size={17}
                color={COLORS.primary}
              />
            </View>

            <View style={styles.info}>

              <Text style={styles.orderId}>
                {order.id}
              </Text>

              <Text style={styles.details}>
                {order.table} • {order.items}{" "}
                {order.items === 1
                  ? "item"
                  : "itens"}
              </Text>

            </View>

            <View style={styles.right}>

              <Text style={styles.total}>
                {order.total}
              </Text>

              <View
                style={[
                  styles.status,
                  {
                    backgroundColor:
                      status.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: status.color,
                    },
                  ]}
                >
                  {order.status}
                </Text>
              </View>

            </View>

          </View>
        );
      })}

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  title: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  order: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F4",
  },

  lastOrder: {
    borderBottomWidth: 0,
  },

  orderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  info: {
    flex: 1,
    marginLeft: 10,
  },

  orderId: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  details: {
    fontSize: 10,
    color: COLORS.textGray,
    marginTop: 2,
  },

  right: {
    alignItems: "flex-end",
  },

  total: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  status: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 4,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "700",
  },
});