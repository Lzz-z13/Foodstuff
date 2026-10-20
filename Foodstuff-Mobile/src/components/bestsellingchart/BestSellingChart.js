import React from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

import { BarChart } from "react-native-gifted-charts";

const COLORS = {
  primary: "#FF6B2C",
  card: "#FFFFFF",
  textDark: "#1F2024",
  textGray: "#8B8D98",
  border: "#ECEDF0",
};

export default function BestSellingChart({ data }) {

  const { width } = useWindowDimensions();

  return (
    <View style={styles.card}>

      <Text style={styles.title}>
        Mais Vendidos
      </Text>

      <Text style={styles.subtitle}>
        Quantidade de itens vendidos
      </Text>

      <BarChart
        data={data}
        width={Math.max(260, width - 70)}
        height={190}
        horizontal
        barWidth={18}
        spacing={17}
        frontColor={COLORS.primary}
        roundedTop
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        xAxisLabelTextStyle={styles.axisText}
        yAxisTextStyle={styles.productText}
        noOfSections={4}
        maxValue={100}
      />

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
    marginBottom: 8,
  },

  axisText: {
    fontSize: 9,
    color: COLORS.textGray,
  },

  productText: {
    fontSize: 9,
    color: COLORS.textDark,
  },
});