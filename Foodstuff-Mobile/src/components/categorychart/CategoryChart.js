import React from "react";
import { View, Text, StyleSheet } from "react-native";

const COLORS = {
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
};

export default function CategoryChart({ data = [] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Categorias</Text>
      <Text style={styles.subtitle}>Participação por venda</Text>

      {data.map((item) => (
        <View key={item.text} style={styles.row}>
          <View style={styles.labelWrap}>
            <View
              style={[styles.dot, { backgroundColor: item.color || COLORS.textDark }]}
            />
            <Text style={styles.label}>{item.text}</Text>
          </View>

          <Text style={styles.value}>{item.value}%</Text>
        </View>
      ))}
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
  },

  title: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
  },

  subtitle: {
    fontSize: 10,
    color: COLORS.textGray,
    marginTop: 2,
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  labelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  label: {
    fontSize: 12,
    color: COLORS.textDark,
  },

  value: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textGray,
  },
});
