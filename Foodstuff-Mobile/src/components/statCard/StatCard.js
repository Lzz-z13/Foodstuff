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

export default function StatCard({
  title,
  value,
  change,
  icon,
  positive,
}) {
  return (
    <View style={styles.card}>

      <View style={styles.topRow}>

        <View style={styles.iconBox}>
          <Ionicons
            name={icon}
            size={17}
            color={COLORS.primary}
          />
        </View>

        <Text
          style={[
            styles.change,
            !positive && styles.neutral,
          ]}
        >
          {change}
        </Text>

      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FFF1EA",
    alignItems: "center",
    justifyContent: "center",
  },

  change: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },

  neutral: {
    color: COLORS.textGray,
  },

  title: {
    marginTop: 10,
    fontSize: 11,
    color: COLORS.textGray,
  },

  value: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textDark,
  },
});